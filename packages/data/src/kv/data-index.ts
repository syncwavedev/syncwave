import bytewise from 'bytewise';
import {z} from 'zod';
import {type Codec} from '../codec.js';
import {AppError} from '../errors.js';
import {assert, compareUint8Array, zip} from '../utils.js';
import {Uuid, UuidCodec, zUuid} from '../uuid.js';
import {
    type Condition,
    mapCondition,
    type Uint8Entry,
    type Uint8Transaction,
} from './kv-store.js';

export interface IndexGetOptions {
    order?: 'asc' | 'desc';
}

export interface Index<TValue> {
    _debug: {
        keys(): Promise<IndexKey[]>;
    };
    info: {
        unique: boolean;
    };
    sync(prev: TValue | undefined, next: TValue | undefined): Promise<void>;
    get(key: IndexKey): AsyncIterable<IndexKey>;
    query(condition: Condition<IndexKey>): AsyncIterable<IndexKey>;
}

export interface IndexOptions<TValue> {
    readonly tx: Uint8Transaction;
    readonly idSelector: (value: TValue) => IndexKey;
    readonly keySelector: (value: TValue) => IndexKey;
    readonly unique: boolean;
    readonly indexName: string;
    readonly filter?: (value: TValue) => boolean;
}

export class UniqueError extends AppError {
    constructor(public readonly indexName: string) {
        super('Unique index constraint violation. Index name: ' + indexName);
    }
}

export function createIndex<TValue>({
    tx,
    idSelector,
    keySelector,
    unique,
    indexName,
    filter: originalFilter,
}: IndexOptions<TValue>): Index<TValue> {
    const filter = originalFilter ?? (() => true);

    async function* queryInternal(
        condition: Condition<IndexKey>
    ): AsyncIterable<Uint8Entry> {
        const conditionKey = mapCondition(condition, {
            gt: cond => cond.gt,
            gte: cond => cond.gte,
            lt: cond => cond.lt,
            lte: cond => cond.lte,
        });

        // we need to add undefined/null at the end for indexes, because it might me not the last component
        // of the index, for example:
        //   condition: {gt: [1]}
        //   index_key: [1, 2]
        //   if we don't add undefined: {gt: [1, undefined]}, index_key would match the condition
        // undefined has the largest type tag in bytewise serialization, null the lowest
        const queryCondition = mapCondition<IndexKey, Condition<Uint8Array>>(
            condition,
            {
                gt: cond => ({
                    gt: encodeIndexKey([
                        ...cond.gt,
                        ...Array<undefined>(16).fill(undefined),
                    ]),
                }),
                gte: cond => ({gte: encodeIndexKey(cond.gte)}),
                lt: cond => ({lt: encodeIndexKey(cond.lt)}),
                lte: cond => ({
                    lte: encodeIndexKey([
                        ...cond.lte,
                        ...Array<undefined>(16).fill(undefined),
                    ]),
                }),
            }
        );

        const iterator = tx.query(queryCondition);

        for await (const entry of iterator) {
            const entryKey = decodeIndexKey(entry.key);
            for (let i = 0; i < conditionKey.length - 1; i += 1) {
                if (compareIndexKeyPart(entryKey[i], conditionKey[i]) !== 0) {
                    return;
                }
            }
            yield entry;
        }
    }

    return {
        info: {
            unique,
        },
        _debug: {
            async keys() {
                const result: IndexKey[] = [];
                for await (const {key} of tx.query({gte: new Uint8Array()})) {
                    result.push(decodeIndexKey(key));
                }

                return result;
            },
        },
        async sync(prev, next) {
            const prevId = prev && idSelector(prev);
            const nextId = next && idSelector(next);
            const id = prevId ?? nextId;

            if (!id) {
                throw new AppError(
                    'invalid index sync: at least prev or next must be present'
                );
            }

            if (prev && next && compareIndexKey(prevId!, nextId!) !== 0) {
                throw new AppError(
                    'invalid index sync: changing id is not allowed'
                );
            }

            const prevKey = prev && keySelector(prev);
            const nextKey = next && keySelector(next);

            const prevIncluded = prev && filter(prev);
            const nextIncluded = next && filter(next);

            if (
                prevKey !== undefined &&
                nextKey !== undefined &&
                zip(prevKey, nextKey).every(
                    ([a, b]) => compareIndexKeyPart(a, b) === 0
                ) &&
                prevIncluded === nextIncluded
            ) {
                // nothing to do
                return;
            }

            // clean up
            if (prevIncluded) {
                assert(prevKey !== undefined, 'prevKey is undefined');
                if (unique) {
                    await tx.delete(encodeIndexKey(prevKey));
                } else {
                    await tx.delete(encodeIndexKey([...prevKey, ...id]));
                }
            }

            // add
            if (nextIncluded) {
                assert(nextKey !== undefined, 'nextKey is undefined');
                if (unique) {
                    const existing = await tx.get(encodeIndexKey(nextKey));
                    if (existing) {
                        throw new UniqueError(indexName);
                    }

                    await tx.put(encodeIndexKey(nextKey), encodeIndexKey(id));
                } else {
                    await tx.put(
                        encodeIndexKey([...nextKey, ...id]),
                        encodeIndexKey(id)
                    );
                }
            }
        },
        async *query(condition): AsyncIterable<IndexKey> {
            for await (const entry of queryInternal(condition)) {
                yield decodeIndexKey(entry.value);
            }
        },
        async *get(key): AsyncIterable<IndexKey> {
            for await (const entry of queryInternal({gte: key})) {
                const entryKey = decodeIndexKey(entry.key);
                for (let i = 0; i < key.length; i += 1) {
                    if (key.length > 0) {
                        // all parts up to the last were checked in queryInternal
                        if (
                            compareIndexKeyPart(
                                entryKey[key.length - 1],
                                key[key.length - 1]
                            ) !== 0
                        ) {
                            return;
                        }
                    }
                }

                yield decodeIndexKey(entry.value);
            }
        },
    };
}

/**
 * bytewise order:
 * - null
 * - false
 * - true
 * - Number (numeric)
 * - Date (numeric, epoch offset)
 * - Buffer (bitwise)
 * - String (lexicographic)
 * - Array (componentwise)
 * - undefined
 */

export type IndexKeyPart =
    | null
    | boolean
    | number
    | string
    | Uuid
    | Uint8Array
    | undefined;

export type IndexKey = readonly IndexKeyPart[];

export function zIndexKey() {
    return z.array(
        z.union([
            z.null(),
            z.boolean(),
            z.number(),
            z.string(),
            zUuid(),
            z.instanceof(Uint8Array),
            z.undefined(),
        ])
    );
}

export function indexKeyToString(key: IndexKey): string {
    return '[' + key.map(x => x?.toString()).join(',') + ']';
}

export function compareIndexKey(a: IndexKey, b: IndexKey) {
    const minLength = Math.min(a.length, b.length);
    for (let i = 0; i < minLength; i += 1) {
        const result = compareIndexKeyPart(a[i], b[i]);
        if (result !== 0) {
            return result;
        }
    }

    return a.length === b.length ? 0 : a.length > b.length ? 1 : -1;
}

export function compareIndexKeyPart(
    a: IndexKeyPart,
    b: IndexKeyPart
): 1 | 0 | -1 {
    if (a === b) return 0;

    if (typeof a === 'boolean' && typeof b === 'boolean') {
        return a === b ? 0 : a ? 1 : -1;
    }

    if (typeof a === 'number' && typeof b === 'number') {
        return a === b ? 0 : a > b ? 1 : -1;
    }

    if (typeof a === 'string' && typeof b === 'string') {
        return a === b ? 0 : a > b ? 1 : -1;
    }

    if (a instanceof Uint8Array && b instanceof Uint8Array) {
        return compareUint8Array(a, b);
    }

    const typeOrder = [
        'null',
        'boolean',
        'number',
        'Uint8Array',
        'string',
        'undefined',
    ];
    const getTypeIndex = (val: IndexKeyPart): number =>
        val === null
            ? typeOrder.indexOf('null')
            : val instanceof Uint8Array
              ? typeOrder.indexOf('Uint8Array')
              : typeOrder.indexOf(typeof val);

    return getTypeIndex(a) > getTypeIndex(b) ? 1 : -1;
}

export function encodeIndexKey(key: IndexKey): Uint8Array {
    return indexKeyCodec.encode(key);
}

export function decodeIndexKey(buf: Uint8Array): IndexKey {
    return indexKeyCodec.decode(buf);
}

export class IndexKeyCodec implements Codec<IndexKey> {
    uuidCodec = new UuidCodec();

    encode(data: IndexKey): Uint8Array {
        const key = data.map(part => {
            if (part instanceof Uint8Array) {
                return Buffer.from(part);
            } else {
                return part;
            }
        });
        return new Uint8Array(bytewise.encode(key));
    }

    decode(buf: Uint8Array): IndexKey {
        const key = bytewise.decode(Buffer.from(buf)) as IndexKey;

        return key.map(part => {
            if (part instanceof Buffer) {
                return new Uint8Array(part);
            } else {
                return part;
            }
        });
    }
}

export const indexKeyCodec = new IndexKeyCodec();
