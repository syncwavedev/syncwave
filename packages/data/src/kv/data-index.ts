import bytewise from 'bytewise';
import {Codec} from '../codec.js';
import {assert, compareUint8Array, zip} from '../utils.js';
import {decodeUuid, encodeUuid, Uuid, UuidCodec} from '../uuid.js';
import {
    Condition,
    mapCondition,
    Uint8Entry,
    Uint8Transaction,
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
    get(key: IndexKey): AsyncIterable<Uuid>;
    query(condition: Condition<IndexKey>): AsyncIterable<Uuid>;
}

export interface IndexOptions<TValue> {
    readonly tx: Uint8Transaction;
    readonly idSelector: (value: TValue) => Uuid;
    readonly keySelector: (value: TValue) => IndexKey;
    readonly unique: boolean;
    readonly indexName: string;
    readonly filter?: (value: TValue) => boolean;
}

export class UniqueError extends Error {
    constructor(public readonly indexName: string) {
        super('unique index constraint violation');
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
    const keyCodec = new IndexKeyCodec();

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
                    gt: keyCodec.encode([
                        ...cond.gt,
                        ...Array(16).fill(undefined),
                    ]),
                }),
                gte: cond => ({gte: keyCodec.encode(cond.gte)}),
                lt: cond => ({lt: keyCodec.encode(cond.lt)}),
                lte: cond => ({
                    lte: keyCodec.encode([
                        ...cond.lte,
                        ...Array(16).fill(undefined),
                    ]),
                }),
            }
        );

        const iterator = tx.query(queryCondition);

        for await (const entry of iterator) {
            const entryKey = keyCodec.decode(entry.key);
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
                    result.push(keyCodec.decode(key));
                }

                return result;
            },
        },
        async sync(prev, next) {
            const prevId = prev && idSelector(prev);
            const nextId = next && idSelector(next);
            const id = prevId ?? nextId;

            if (!id) {
                throw new Error(
                    'invalid index sync: at least prev or next must be present'
                );
            }

            if (prev && next && prevId !== nextId) {
                throw new Error(
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
                assert(prevKey !== undefined);
                if (unique) {
                    await tx.delete(keyCodec.encode(prevKey));
                } else {
                    await tx.delete(keyCodec.encode([...prevKey, id]));
                }
            }

            // add
            if (nextIncluded) {
                assert(nextKey !== undefined);
                if (unique) {
                    const existing = await tx.get(keyCodec.encode(nextKey));
                    if (existing) {
                        throw new UniqueError(indexName);
                    }

                    await tx.put(keyCodec.encode(nextKey), encodeUuid(id));
                } else {
                    await tx.put(
                        keyCodec.encode([...nextKey, id]),
                        encodeUuid(id)
                    );
                }
            }
        },
        async *query(condition): AsyncIterable<Uuid> {
            for await (const entry of queryInternal(condition)) {
                yield decodeUuid(entry.value);
            }
        },
        async *get(key): AsyncIterable<Uuid> {
            for await (const entry of queryInternal({gte: key})) {
                const entryKey = keyCodec.decode(entry.key);
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

                yield decodeUuid(entry.value);
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
        const key = bytewise.decode(Buffer.from(buf));

        return key.map((part: unknown) => {
            if (part instanceof Buffer) {
                return new Uint8Array(part);
            } else {
                return part;
            }
        });
    }
}
