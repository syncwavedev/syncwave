import {z} from 'zod';
import {AppError} from '../errors.js';
import {
    compareTuple,
    compareTupleItem,
    decodeTuple,
    encodeTuple,
    getTupleLargestChild,
    type Tuple,
} from '../tuple.js';
import {assert, zip} from '../utils.js';
import {zUuid} from '../uuid.js';
import {
    type AppEntry,
    type AppTransaction,
    type Condition,
    mapCondition,
} from './kv-store.js';

export interface IndexGetOptions {
    order?: 'asc' | 'desc';
}

export interface Index<TValue> {
    info: {
        unique: boolean;
    };
    sync(prev: TValue | undefined, next: TValue | undefined): Promise<void>;
    get(key: Tuple): AsyncIterable<Tuple>;
    query(condition: Condition<Tuple>): AsyncIterable<Tuple>;
}

export interface IndexOptions<TValue> {
    readonly tx: AppTransaction;
    readonly idSelector: (value: TValue) => Tuple;
    readonly keySelector: (value: TValue) => Tuple;
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
        condition: Condition<Tuple>
    ): AsyncIterable<AppEntry> {
        const conditionKey = mapCondition(condition, {
            gt: cond => cond.gt,
            gte: cond => cond.gte,
            lt: cond => cond.lt,
            lte: cond => cond.lte,
        });

        // we need to add 0xff at the end for indexes, because it might me not the last component
        // of the index, for example:
        //   condition: {gt: [1]}
        //   index_key: [1, 2]
        //   if we don't add 0xff: {gt: [1, 0xff]}, index_key would match the condition
        // 0xff has the largest type tag in tuple serialization
        const queryCondition = mapCondition<Tuple, Condition<Tuple>>(
            condition,
            {
                gt: cond => ({
                    gt: getTupleLargestChild(cond.gt),
                }),
                gte: cond => ({gte: cond.gte}),
                lt: cond => ({lt: cond.lt}),
                lte: cond => ({
                    lte: getTupleLargestChild(cond.lte),
                }),
            }
        );

        const iterator = tx.query(queryCondition);

        for await (const entry of iterator) {
            for (let i = 0; i < conditionKey.length - 1; i += 1) {
                if (compareTupleItem(entry.key[i], conditionKey[i]) !== 0) {
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
        async sync(prev, next) {
            const prevId = prev && idSelector(prev);
            const nextId = next && idSelector(next);
            const id = prevId ?? nextId;

            if (!id) {
                throw new AppError(
                    'invalid index sync: at least prev or next must be present'
                );
            }

            if (prev && next && compareTuple(prevId!, nextId!) !== 0) {
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
                    ([a, b]) => compareTupleItem(a, b) === 0
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
                    await tx.delete(prevKey);
                } else {
                    await tx.delete([...prevKey, ...id]);
                }
            }

            // add
            if (nextIncluded) {
                assert(nextKey !== undefined, 'nextKey is undefined');
                if (unique) {
                    const existing = await tx.get(nextKey);
                    if (existing) {
                        throw new UniqueError(indexName);
                    }

                    await tx.put(nextKey, encodeTuple(id));
                } else {
                    await tx.put([...nextKey, ...id], encodeTuple(id));
                }
            }
        },
        async *query(condition): AsyncIterable<Tuple> {
            for await (const entry of queryInternal(condition)) {
                yield decodeTuple(entry.value);
            }
        },
        async *get(key): AsyncIterable<Tuple> {
            for await (const entry of queryInternal({gte: key})) {
                for (let i = 0; i < key.length; i += 1) {
                    if (key.length > 0) {
                        // all parts up to the last were checked in queryInternal
                        if (
                            compareTupleItem(
                                entry.key[key.length - 1],
                                key[key.length - 1]
                            ) !== 0
                        ) {
                            return;
                        }
                    }
                }

                yield decodeTuple(entry.value);
            }
        },
    };
}

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
