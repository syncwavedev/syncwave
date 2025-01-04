import {Condition, Uint8Transaction} from '../kv/kv-store';
import {MsgpackrSerializer} from '../msgpackr-serializer';
import {Uuid, UuidSerializer} from '../uuid';

export interface IndexGetOptions {
    order?: 'asc' | 'desc';
}

export interface Index<TKey, TValue> {
    sync(prev: TValue | undefined, next: TValue | undefined): Promise<void>;
    query(condition: Condition<TKey>): AsyncIterable<TValue>;
}

export interface IndexOptions<TKey extends Array<string | number | Uuid>, TValue> {
    readonly txn: Uint8Transaction;
    readonly name: string;
    readonly idSelector: (value: TValue) => Uuid;
    readonly keySelector: (value: TValue) => TKey;
    readonly unique: boolean;
}

export function createIndex<TKey extends Array<string | number | Uuid>, TValue>({
    txn,
    idSelector,
    keySelector,
    unique,
}: IndexOptions<TKey, TValue>): Index<TKey, TValue> {
    const keySerializer = new MsgpackrSerializer();
    const uuidSerializer = new UuidSerializer();

    return {
        async sync(prev, next) {
            const prevId = prev && idSelector(prev);
            const nextId = next && idSelector(next);
            const id = prevId ?? nextId;

            if (!id) {
                throw new Error('invalid index sync: at least prev or next must be present');
            }

            if (prev && next && prevId !== nextId) {
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
                    await txn.delete(keySerializer.encode(prevKey));
                } else {
                    await txn.delete(keySerializer.encode([...prevKey, id]));
                }
            }

            // add
            if (nextKey) {
                if (unique) {
                    const existing = await txn.get(keySerializer.encode(nextKey));
                    if (existing) {
                        throw new Error('unique index constraint violation');
                    }

                    await txn.put(keySerializer.encode(nextKey), uuidSerializer.encode(id));
                } else {
                    await txn.put(keySerializer.encode([...nextKey, id]), new Uint8Array());
                }
            }
        },
        query: async function* (key) {},
    };
}
