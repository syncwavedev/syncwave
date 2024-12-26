import {applyUpdateV2, encodeStateAsUpdateV2, Array as YArray, Doc as YDoc, Map as YMap, Text as YText} from 'yjs';
import {Serializer} from '../contracts/serializer';
import {JsonSerializer} from '../json-serializer';
import {assert, Brand} from '../utils';
import {observe, OpLog} from './observe';
import {Richtext} from './richtext';
import {Schema} from './schema';

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
        const [replacement, log] = observe(mapFromYValue(this.schema, this.yValue), draft => recipe(draft));
        if (replacement) {
            this.schema.assertValid(replacement);
            this.yValue = mapToYValue(this.schema, replacement);
        } else {
            replayLog(this.schema, this.yValue, log);
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

    private copyYValue(): YValue {
        return Doc.load(this.schema, this.state()).yValue;
    }
}

type YValue = YMap<YValue> | YArray<YValue> | YText | number | boolean | string | null | undefined;

// using JsonSerializer for simplicity sake, more efficient serialization would require varint serialization
const intToStringSerializer: Serializer<number, string> = new JsonSerializer();

function mapFromYValue<T>(schema: Schema<T>, yValue: YValue): T {
    throw new Error('not implemented');
}

// mapToYValue assumes that value is valid for the given schema
function mapToYValue<T>(schema: Schema<T>, value: T): YValue {
    return schema.visit<YValue>({
        nullable: nullable => (value === null ? null : mapToYValue(nullable.inner, value as any)),
        optional: optional => (value === null ? null : mapToYValue(optional.inner, value as any)),
        array: array => {
            assert(Array.isArray(value));

            const result = new YArray<YValue>();
            result.push(value.map(x => mapToYValue(array.item, x)));

            return result;
        },
        boolean: () => value as boolean,
        number: () => value as number,
        richtext: () => {
            const delta = (value as Richtext).toDelta();
            const result = new YText();
            result.applyDelta(delta, {sanitize: false});
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

function replayLog<T>(schema: Schema<T>, yValue: YValue, log: OpLog): void {
    throw new Error('not implemented');
}
