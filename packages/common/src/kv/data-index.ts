import {decode, encode} from 'bytewise';
import {Encoder} from '../encoder';
import {compareUint8Array} from '../utils';
import {Uuid, UuidEncoder} from '../uuid';
import {Condition, Uint8Transaction, mapCondition} from './kv-store';

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
    readonly txn: Uint8Transaction;
    readonly idSelector: (value: TValue) => Uuid;
    readonly keySelector: (value: TValue) => IndexKey;
    readonly unique: boolean;
}

export function createIndex<TValue>({txn, idSelector, keySelector, unique}: IndexOptions<TValue>): Index<TValue> {
    const keyEncoder = new KeyEncoder();
    const uuidEncoder = new UuidEncoder();

    async function* queryInternal(condition: Condition<IndexKey>) {
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
        const queryCondition = mapCondition<IndexKey, Condition<Uint8Array>>(condition, {
            gt: cond => ({gt: keyEncoder.encode([...cond.gt, ...Array(16).fill(undefined)])}),
            gte: cond => ({gte: keyEncoder.encode(cond.gte)}),
            lt: cond => ({lt: keyEncoder.encode(cond.lt)}),
            lte: cond => ({lte: keyEncoder.encode([...cond.lte, ...Array(16).fill(undefined)])}),
        });

        const iterator = txn.query(queryCondition);

        for await (const entry of iterator) {
            const entryKey = keyEncoder.decode(entry.key);
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
                for await (const {key} of txn.query({gte: new Uint8Array()})) {
                    result.push(keyEncoder.decode(key));
                }

                return result;
            },
        },
        async sync(prev, next) {
            const prevId = prev && idSelector(prev);
            const nextId = next && idSelector(next);
            const id = prevId ?? nextId;

            if (!id) {
                throw new Error('invalid index sync: at least prev or next must be present');
            }

            if (prev && next && !prevId!.equals(nextId!)) {
                throw new Error('invalid index sync: changing id is not allowed');
            }

            const prevKey = prev && keySelector(prev);
            const nextKey = next && keySelector(next);

            if (prevKey === nextKey) {
                // nothing to do
                return;
            }

            // clean up
            if (prevKey) {
                if (unique) {
                    await txn.delete(keyEncoder.encode(prevKey));
                } else {
                    await txn.delete(keyEncoder.encode([...prevKey, id]));
                }
            }

            // add
            if (nextKey) {
                if (unique) {
                    const existing = await txn.get(keyEncoder.encode(nextKey));
                    if (existing) {
                        throw new Error('unique index constraint violation');
                    }

                    await txn.put(keyEncoder.encode(nextKey), uuidEncoder.encode(id));
                } else {
                    await txn.put(keyEncoder.encode([...nextKey, id]), uuidEncoder.encode(id));
                }
            }
        },
        async *query(condition) {
            for await (const entry of queryInternal(condition)) {
                yield uuidEncoder.decode(entry.value);
            }
        },
        async *get(key) {
            for await (const entry of queryInternal({gte: key})) {
                const entryKey = keyEncoder.decode(entry.key);
                for (let i = 0; i < key.length; i += 1) {
                    if (key.length > 0) {
                        // all parts up to the last were checked in queryInternal
                        if (compareIndexKeyPart(entryKey[key.length - 1], key[key.length - 1]) !== 0) {
                            return;
                        }
                    }
                }

                yield uuidEncoder.decode(entry.value);
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

const uuidSerializer = new UuidEncoder();
export type IndexKeyPart = null | boolean | number | string | Uuid | Uint8Array | undefined;

export type IndexKey = readonly IndexKeyPart[];

export function compareIndexKeyPart(a: IndexKeyPart, b: IndexKeyPart): 1 | 0 | -1 {
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

    if (a instanceof Uuid && b instanceof Uuid) {
        return a.compare(b);
    }

    if (a instanceof Uint8Array && b instanceof Uint8Array) {
        return compareUint8Array(a, b);
    }

    const typeOrder = ['null', 'boolean', 'number', 'Uuid', 'Uint8Array', 'string', 'undefined'];
    const getTypeIndex = (val: IndexKeyPart): number =>
        val === null
            ? typeOrder.indexOf('null')
            : val instanceof Uuid
              ? typeOrder.indexOf('Uuid')
              : val instanceof Uint8Array
                ? typeOrder.indexOf('Uint8Array')
                : typeOrder.indexOf(typeof val);

    return getTypeIndex(a) > getTypeIndex(b) ? 1 : -1;
}

export class KeyEncoder implements Encoder<IndexKey> {
    encode(data: IndexKey): Uint8Array {
        const key = data.map(part => {
            if (part instanceof Uuid) {
                return [1, Buffer.from(uuidSerializer.encode(part))];
            } else if (part instanceof Uint8Array) {
                return Buffer.from(part);
            } else {
                return part;
            }
        });
        return new Uint8Array(encode(key));
    }

    decode(buf: Uint8Array): IndexKey {
        const key = decode(Buffer.from(buf));

        return key.map(part => {
            if (Array.isArray(part)) {
                return uuidSerializer.decode(part[1]);
            } else if (part instanceof Buffer) {
                return new Uint8Array(part);
            } else {
                return part;
            }
        });
    }
}

const keySer = new KeyEncoder();
