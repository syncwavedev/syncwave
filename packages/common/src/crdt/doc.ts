import Delta from 'quill-delta';
import {applyUpdateV2, encodeStateAsUpdateV2, Array as YArray, Doc as YDoc, Map as YMap, Text as YText} from 'yjs';
import {Serializer} from '../contracts/serializer';
import {JsonSerializer} from '../json-serializer';
import {assert, assertNever, Brand, zip} from '../utils';
import {observe, OpLog} from './observe';
import {Richtext} from './richtext';
import {ArraySchema, MapSchema, ObjectSchema, RichtextSchema, Schema} from './schema';

export type DocDiff<T> = Brand<Uint8Array, [T, 'doc_diff']>;

type Unsubscribe = () => void;

const ROOT_KEY = 'root';
const ROOT_VALUE = 'value';

export class Doc<T> {
    static create<T>(schema: Schema<T>, value: T): Doc<T> {
        schema.assertValid(value);

        const doc = new YDoc();
        const rootMap = doc.getMap<YValue>(ROOT_KEY);
        rootMap.set(ROOT_VALUE, mapToYValue(schema, value));

        return new Doc(schema, doc);
    }

    static load<T>(schema: Schema<T>, diff: DocDiff<T>): Doc<T> {
        const doc = new YDoc();
        applyUpdateV2(doc, diff);

        return new Doc(schema, doc);
    }

    private constructor(
        private schema: Schema<T>,
        private doc: YDoc
    ) {}

    private get root(): YMap<YValue> {
        return this.doc.getMap(ROOT_KEY);
    }

    private get yValue(): YValue {
        return this.root.get(ROOT_VALUE);
    }

    private set yValue(value: YValue) {
        this.root.set(ROOT_VALUE, value);
    }

    snapshot(): T {
        return this.map(x => x);
    }

    state(): DocDiff<T> {
        return encodeStateAsUpdateV2(this.doc) as DocDiff<T>;
    }

    map<TResult>(mapper: (snapshot: T) => TResult): TResult {
        // for simplicity sake we make full copy of the Doc to create a snapshot,
        // even though not all fields might be needed by the mapper
        return mapper(mapFromYValue(this.schema, this.yValue));
    }

    // if recipe returns T, then whole doc is overridden with the returned value
    update(recipe: (draft: T) => T | void): void {
        const value = mapFromYValue(this.schema, this.yValue);
        const locator = new Locator();
        locator.addDeep(value, this.yValue, this.schema);

        const [replacement, log] = observe(value, draft => recipe(draft));
        if (replacement) {
            this.schema.assertValid(replacement);
            this.yValue = mapToYValue(this.schema, replacement);
        } else {
            replayLog(log, locator);
        }
    }

    apply(diff: DocDiff<T>, options?: {tag: string}): void {
        applyUpdateV2(this.doc, diff, options?.tag);
    }

    subscribe(next: (diff: DocDiff<T>, tag: string | undefined) => void): Unsubscribe {
        const fn = (state: Uint8Array, tag: string | undefined) => next(state as DocDiff<T>, tag);
        this.doc.on('updateV2', (diff, tag) => {
            fn(diff, tag);
        });

        return () => this.doc.off('update', fn);
    }
}

type YValue = YMap<YValue> | YArray<YValue> | YText | number | boolean | string | null | undefined;

// using JsonSerializer for simplicity sake, more efficient serialization would require varint serialization
const intToStringSerializer: Serializer<number, string> = new JsonSerializer();

function mapFromYValue<T>(schema: Schema<T>, yValue: YValue): T {
    return schema.visit<any>({
        nullable: nullable => (yValue === null ? null : mapFromYValue(nullable.inner, yValue)),
        optional: optional => (yValue === undefined ? undefined : mapFromYValue(optional.inner, yValue)),
        array: array => [...(yValue as YArray<any>).map(item => mapFromYValue(array.item, item.get('value')))],
        boolean: () => yValue,
        number: () => yValue,
        string: () => yValue,
        object: object => {
            const result: any = {};
            for (const [key, value] of (yValue as YMap<any>).entries()) {
                const field = object.fields.find(x => x.id === intToStringSerializer.decode(key));
                assert(field !== undefined);

                result[field.name] = mapFromYValue(field.schema, value);
            }

            return result;
        },
        richtext: () => new Richtext(new Delta({ops: (yValue as YText).toDelta()})),
        map: map =>
            new Map([...(yValue as YMap<any>).entries()].map(([key, value]) => [key, mapFromYValue(map.value, value)])),
    });
}

// mapToYValue assumes that value is valid for the given schema
function mapToYValue<T>(schema: Schema<T>, value: T): YValue {
    return schema.visit<YValue>({
        nullable: nullable => (value === null ? null : mapToYValue(nullable.inner, value as any)),
        optional: optional => (value === undefined ? undefined : mapToYValue(optional.inner, value as any)),
        array: array => {
            assert(Array.isArray(value));

            const result = new YArray<YValue>();
            result.push(value.map(x => new YMap<YValue>([['value', mapToYValue(array.item, x)]])));

            return result;
        },
        boolean: () => value as boolean,
        number: () => value as number,
        richtext: () => {
            const delta = (value as Richtext).toDelta();
            const result = new YText();
            result.applyDelta(delta.ops, {sanitize: false});
            return result;
        },
        string: () => value as string,
        map: map => {
            assert(value instanceof Map);
            const entries = [...value.entries()].map(([key, value]) => [key, mapToYValue(map.value, value)] as const);
            return new YMap(entries);
        },
        object: object => {
            assert(typeof value === 'object' && value !== null);

            const result = new YMap<YValue>();
            for (const [key, fieldValue] of Object.entries(value)) {
                const field = object.fields.find(x => x.name === key);

                // mapToYValue assumes that value is valid for the given schema
                assert(field !== undefined);

                result.set(intToStringSerializer.encode(field.id), mapToYValue(field.schema, fieldValue));
            }

            return result;
        },
    });
}

interface LocatorEntry {
    readonly yValue: any;
    readonly schema: Schema<any>;
}

class Locator {
    private map = new Map<any, LocatorEntry>();

    constructor() {}

    locate(subject: any): LocatorEntry {
        const result = this.map.get(subject);

        if (!result) {
            throw new Error('could not locate subject ' + subject);
        }

        return result;
    }

    addDeep(subject: any, yValue: YValue, schema: Schema<any>) {
        schema.visit({
            nullable: nullable => {
                if (subject !== null) {
                    this.addDeep(subject, yValue, nullable.inner);
                }
            },
            optional: optional => {
                if (subject !== undefined) {
                    this.addDeep(subject, yValue, optional.inner);
                }
            },
            boolean: () => {},
            string: () => {},
            number: () => {},
            array: array => {
                this.map.set(subject, {yValue, schema});
                for (let i = 0; i < subject.length; i += 1) {
                    const subjectItem = subject[i];
                    const yValueItem = (yValue as YArray<any>)[i];

                    this.addDeep(subjectItem, yValueItem, array.item);
                }
            },
            map: map => {
                this.map.set(subject, {yValue, schema});

                for (const [key, subjectValue] of subject.entries()) {
                    const yValueValue = (yValue as YMap<any>).get(key);

                    this.addDeep(subjectValue, yValueValue, map.value);
                }
            },

            richtext: () => {
                this.map.set(subject, {yValue, schema});
            },
            object: object => {
                this.map.set(subject, {yValue, schema});

                for (const [key, subjectValue] of Object.entries(subject)) {
                    const field = object.fields.find(x => x.name === key);
                    assert(field !== undefined);

                    const yValueValue = (yValue as YMap<any>).get(field.id.toString());

                    this.addDeep(subjectValue, yValueValue, field.schema);
                }
            },
        });
    }
}

function replayLog(log: OpLog, locator: Locator): void {
    for (const entry of log) {
        const {schema, yValue} = locator.locate(entry.subject);

        if (entry.type === 'array_push') {
            assert(yValue instanceof YArray && schema instanceof ArraySchema);

            const yArgs = entry.args.map(x => new YMap<YValue>([['value', mapToYValue(schema.item, x)]]));
            yValue.push(yArgs);

            zip(entry.args, yArgs).forEach(([arg, yArg]) => locator.addDeep(arg, yArg, schema));
        } else if (entry.type === 'array_unshift') {
            assert(yValue instanceof YArray && schema instanceof ArraySchema);

            const yArgs = entry.args.map(x => new YMap<YValue>([['value', mapToYValue(schema.item, x)]]));
            yValue.unshift(yArgs);

            zip(entry.args, yArgs).forEach(([arg, yArg]) => locator.addDeep(arg, yArg, schema));
        } else if (entry.type === 'array_set') {
            assert(yValue instanceof YArray && schema instanceof ArraySchema);

            yValue.get(entry.index).set('value', mapToYValue(schema.item, entry.value));
            locator.addDeep(entry.value, yValue[entry.index], schema.item);
        } else if (entry.type === 'map_clear') {
            assert(yValue instanceof YMap);
            yValue.clear();
        } else if (entry.type === 'map_delete') {
            assert(yValue instanceof YMap);
            yValue.delete(entry.args[0]);
        } else if (entry.type === 'map_set') {
            assert(yValue instanceof YMap && schema instanceof MapSchema);
            const yMapValue = mapToYValue(schema.value, entry.args[1]);
            yValue.set(entry.args[0], yMapValue);
            locator.addDeep(entry.args[1], yMapValue, schema.value);
        } else if (entry.type === 'object_delete') {
            assert(yValue instanceof YMap && schema instanceof ObjectSchema);
            const field = schema.fields.find(x => x.name === entry.prop);
            assert(field !== undefined);
            yValue.delete(field.id.toString());
        } else if (entry.type === 'object_set') {
            assert(yValue instanceof YMap && schema instanceof ObjectSchema);
            const field = schema.fields.find(x => x.name === entry.prop);
            assert(field !== undefined);
            const yMapValue = mapToYValue(field.schema, entry.value);
            yValue.set(field.id.toString(), yMapValue);
            locator.addDeep(entry.value, yMapValue, field.schema);
        } else if (entry.type === 'richtext_insert') {
            assert(yValue instanceof YText && schema instanceof RichtextSchema);
            yValue.insert(...entry.args);
        } else if (entry.type === 'richtext_applyDelta') {
            assert(yValue instanceof YText && schema instanceof RichtextSchema);
            yValue.applyDelta(entry.args[0].ops);
        } else if (entry.type === 'richtext_delete') {
            assert(yValue instanceof YText && schema instanceof RichtextSchema);
            yValue.delete(...entry.args);
        } else if (entry.type === 'richtext_format') {
            assert(yValue instanceof YText && schema instanceof RichtextSchema);
            yValue.format(...entry.args);
        } else {
            assertNever(entry);
        }
    }
}
