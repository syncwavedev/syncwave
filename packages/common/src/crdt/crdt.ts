import {applyUpdateV2, encodeStateAsUpdateV2, Array as YArray, Doc as YDoc, Map as YMap, Text as YText} from 'yjs';
import {Serializer} from '../contracts/serializer';
import {JsonSerializer} from '../json-serializer';
import {assert, Brand} from '../utils';
import {Richtext} from './richtext';
import {
    array,
    ArraySchema,
    InferSchemaValue,
    map,
    MapSchema,
    number,
    object,
    ObjectSchema,
    richtext,
    RichtextSchema,
    Schema,
    string,
} from './schema';

export type DocDiff<T> = Brand<Uint8Array, [T, 'doc_diff']>;

type Unsubscribe = () => void;

const ROOT_KEY = 'root';
const ROOT_VALUE = 'value';

class Doc<T> {
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
        const log: OpLog = [];
        const draft = createProxy(this.schema, mapFromYValue(this.schema, this.yValue), log, []);

        const replacement = recipe(draft);
        if (replacement) {
            this.schema.assertValid(replacement);
            this.yValue = mapToYValue(this.schema, replacement);
        } else {
            replayLog(this.schema, this.yValue, log);
        }
    }

    apply(diff: DocDiff<T>): void {
        applyUpdateV2(this.doc, diff);
    }

    subscribe(next: (diff: DocDiff<T>) => void): Unsubscribe {
        const fn = (state: Uint8Array) => next(state as DocDiff<T>);
        this.doc.on('updateV2', fn);

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

type Path = Array<string | number>;

interface BaseOpLogEntry<TType extends string> {
    readonly type: TType;
    readonly path: Path;
}

type Method<T extends {prototype: any}> = {
    [K in keyof T['prototype']]: T['prototype'][K] extends (...args: any) => any ? K : never;
}[keyof T['prototype']];

interface BaseArrayLog<TMethod extends Extract<Method<typeof Array>, string>>
    extends BaseOpLogEntry<`array_${TMethod}`> {
    readonly args: Parameters<(typeof Array.prototype)[TMethod]>;
}

interface ArrayPushLog extends BaseArrayLog<'push'> {}

interface ArrayUnshiftLog extends BaseArrayLog<'unshift'> {}

interface ArraySetLog extends BaseOpLogEntry<'array_set'> {
    readonly index: number;
    readonly value: any;
}

interface BaseMapLog<TMethod extends Extract<Method<typeof Map>, string>> extends BaseOpLogEntry<`map_${TMethod}`> {
    readonly args: Parameters<(typeof Map.prototype)[TMethod]>;
}

interface MapSetLog extends BaseMapLog<'set'> {}

interface MapDeleteLog extends BaseMapLog<'delete'> {}

interface MapClearLog extends BaseMapLog<'clear'> {}

type OpLogEntry = ArrayPushLog | ArrayUnshiftLog | ArraySetLog | MapSetLog | MapDeleteLog | MapClearLog;
type OpLog = OpLogEntry[];

function replayLog<T>(schema: Schema<T>, yValue: YValue, log: OpLog): void {
    throw new Error('not implemented');
}

function wrapFn<T extends (...args: any[]) => any>(thisArg: any, fn: T, before: (args: Parameters<T>) => void): T {
    return new Proxy(fn, {
        apply(target, _thisArg: any, args: any[]) {
            before(args as Parameters<T>);
            return Reflect.apply(target, thisArg, args);
        },
    });
}

function createArrayProxy<T>(schema: ArraySchema<T>, value: Array<T>, log: OpLog, path: Path): T[] {
    return new Proxy(value, {
        get(target, prop, receiver) {
            const original = Reflect.get(target, prop, receiver);

            const typedProp: keyof Array<any> = prop as keyof Array<any>;

            if (
                typeof typedProp === 'number' ||
                typedProp === Symbol.iterator ||
                typedProp === Symbol.unscopables ||
                typedProp === 'at' ||
                typedProp === 'concat' ||
                typedProp === 'entries' ||
                typedProp === 'every' ||
                typedProp === 'filter' ||
                typedProp === 'find' ||
                typedProp === 'findIndex' ||
                typedProp === 'flat' ||
                typedProp === 'flatMap' ||
                typedProp === 'forEach' ||
                typedProp === 'includes' ||
                typedProp === 'indexOf' ||
                typedProp === 'join' ||
                typedProp === 'keys' ||
                typedProp === 'lastIndexOf' ||
                typedProp === 'length' ||
                typedProp === 'map' ||
                typedProp === 'reduce' ||
                typedProp === 'reduceRight' ||
                typedProp === 'slice' ||
                typedProp === 'some' ||
                typedProp === 'toLocaleString' ||
                typedProp === 'toString' ||
                typedProp === 'values'
            ) {
                // read methods, no logs needed
            } else if (
                typedProp === 'copyWithin' ||
                typedProp === 'reverse' ||
                typedProp === 'fill' ||
                typedProp === 'pop' ||
                typedProp === 'shift' ||
                typedProp === 'sort' ||
                typedProp === 'splice'
            ) {
                throw new Error('unsupported CRDT array modification: ' + typedProp);
            } else if (typedProp === 'push') {
                return wrapFn(target, original as typeof Array.prototype.push, args =>
                    log.push({type: 'array_push', args, path})
                );
            } else if (typedProp === 'unshift') {
                return wrapFn(target, original as typeof Array.prototype.unshift, args =>
                    log.push({type: 'array_unshift', args, path})
                );
            } else {
                const _: never = typedProp;
            }

            return original;
        },
        set(target, prop, value, receiver) {
            if (typeof prop !== 'string' || !Number.isInteger(+prop)) {
                throw new Error('unsupported CRDT array modification: set ' + prop.toString());
            }

            log.push({
                type: 'array_set',
                path,
                index: +prop.toString(),
                value,
            });

            return Reflect.set(target, prop, value, receiver);
        },
    });
}

function createMapProxy<T>(schema: MapSchema<T>, value: Map<string, T>, log: OpLog, path: Path): Map<string, T> {
    return new Proxy(value, {
        get(target, prop, receiver) {
            // Typical read or method access on the Map
            const original = Reflect.get(target, prop, receiver);

            // Distinguish Map methods we want to intercept
            const typedProp = prop as keyof Map<string, T>;

            if (
                typedProp === Symbol.iterator ||
                typedProp === Symbol.toStringTag ||
                typedProp === 'get' ||
                typedProp === 'has' ||
                typedProp === 'entries' ||
                typedProp === 'keys' ||
                typedProp === 'values' ||
                typedProp === 'forEach' ||
                typedProp === 'size'
            ) {
                // read methods, no logs needed
                return original;
            } else if (typedProp === 'set') {
                return wrapFn(target, original as typeof Map.prototype.set, args => {
                    log.push({
                        type: 'map_set',
                        path,
                        args,
                    });
                });
            } else if (typedProp === 'delete') {
                return wrapFn(target, original as typeof Map.prototype.delete, args => {
                    log.push({
                        type: 'map_delete',
                        path,
                        args,
                    });
                });
            } else if (typedProp === 'clear') {
                return wrapFn(target, original as typeof Map.prototype.clear, args => {
                    log.push({
                        type: 'map_clear',
                        path,
                        args,
                    });
                });
            } else {
                const _: never = typedProp;
            }

            return original;
        },

        // Setting properties on the Map object itself (not via .set())
        // is typically not how Maps are used. If it happens, decide if you want to allow it:
        set(target, prop, newValue, receiver) {
            // If this occurs, it's something like mapProxy.someProp = ...
            // which is generally outside normal Map usage.
            throw new Error('unsupported CRDT map modification: direct set of property ' + prop.toString());
        },
    });
}

function createObjectProxy<T extends object>(schema: ObjectSchema<T>, value: T, log: OpLog): T {
    throw new Error('not implemented');
}

function createRichtextProxy(schema: RichtextSchema, value: Richtext, log: OpLog): Richtext {
    throw new Error('not implemented');
}

// createProxy assumes that yValue is valid for the given schema
function createProxy<T>(schema: Schema<T>, value: T, log: OpLog, path: Path): T {
    return schema.visit<any>({
        number: () => value,
        boolean: () => value,
        string: () => value,
        richtext: richtextSchema => createRichtextProxy(richtextSchema, value as Richtext, log),
        nullable: ({inner}) => (value === null ? null : createProxy(inner, value as any, log, path)),
        optional: ({inner}) => (value === undefined ? undefined : createProxy(inner, value as any, log, path)),
        array: arraySchema => createArrayProxy(arraySchema, value as Array<any>, log, path),
        map: mapSchema => createMapProxy(mapSchema, value as Map<string, any>, log, path),
        object: objectSchema => createObjectProxy(objectSchema, value as object, log),
    });
}

// playground

const taskSchema = object({
    title: [1, string()],
    description: [2, richtext()],
    tags: [3, map(number())],
    reactions: [4, array(string()).optional()],
    meta: [
        5,
        object({
            createdAt: [0, number()],
            updatedAt: [1, number()],
        }),
    ],
});

const description = new Richtext();
description.insert(0, 'some desc');

const doc = Doc.create(taskSchema, {
    title: 'sdf',
    description,
    tags: new Map([
        ['green', 2],
        ['blue', 3],
    ]),
    reactions: undefined,
    meta: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
});

console.log(doc.snapshot().title);
doc.update(draft => {
    draft.reactions?.push('more!');
    draft.title = 'new ' + draft.title;
    draft.meta = {
        createdAt: draft.meta.createdAt,
        updatedAt: Date.now(),
    };
});

const info = doc.map(x => x.title + ' ' + x.reactions?.length);

type Task = InferSchemaValue<typeof taskSchema>;
