import {AppError} from '../errors.js';
import {RwLock} from '../rw-lock.js';
import {
    compareTuple,
    compareTupleItem,
    decodeTuple,
    encodeTuple,
    getTupleLargestChild,
    type Tuple,
} from '../tuple.js';
import {assert, whenAll} from '../utils.js';
import {
    mapCondition,
    type AppEntry,
    type AppTransaction,
    type Condition,
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
    readonly keySelector: (value: TValue) => Tuple[];
    readonly unique: boolean;
    readonly indexName: string;
    readonly filter?: (value: TValue) => boolean;
}

export class UniqueError extends AppError {
    constructor(
        public readonly indexName: string,
        public readonly conflictKey: Tuple,
        public readonly conflictValue: Tuple
    ) {
        super('Unique index constraint violation. Index name: ' + indexName);
    }
}

function diffKeys(prev: Tuple[], next: Tuple[]) {
    const removed = prev.filter(
        x => next.findIndex(y => compareTuple(x, y) === 0) === -1
    );
    const added = next.filter(
        x => prev.findIndex(y => compareTuple(x, y) === 0) === -1
    );

    return {removed, added};
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

    async function sync(prev: TValue | undefined, next: TValue | undefined) {
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

        const prevIncluded = prev && filter(prev);
        const nextIncluded = next && filter(next);

        const prevKeys = prev && prevIncluded ? keySelector(prev) : [];
        const nextKeys = next && nextIncluded ? keySelector(next) : [];

        const {removed, added} = diffKeys(prevKeys, nextKeys);

        await whenAll([
            ...removed.map(async key => {
                if (!prevIncluded) return;

                assert(prevId !== undefined, 'prevId is undefined');
                if (unique) {
                    console.log('delete', key, prevId);
                    await tx.delete(key);
                } else {
                    await tx.delete([...key, ...prevId]);
                }
            }),
            ...added.map(async key => {
                if (!nextIncluded) return;

                assert(nextId !== undefined, 'nextId is undefined');
                if (unique) {
                    const existing = await tx.get(key);
                    if (existing) {
                        throw new UniqueError(
                            indexName,
                            key,
                            decodeTuple(existing)
                        );
                    }
                    console.log('add', key, prevId);

                    await tx.put(key, encodeTuple(id));
                } else {
                    await tx.put([...key, ...id], encodeTuple(id));
                }
            }),
        ]);
    }

    const lock = new RwLock();

    return {
        info: {
            unique,
        },
        async sync(prev, next) {
            return await lock.runWrite(() => sync(prev, next));
        },
        async *query(condition): AsyncIterable<Tuple> {
            await lock.readLock();
            try {
                for await (const entry of queryInternal(condition)) {
                    yield decodeTuple(entry.value);
                }
            } finally {
                lock.unlockRead();
            }
        },
        async *get(key): AsyncIterable<Tuple> {
            await lock.readLock();
            try {
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
            } finally {
                lock.unlockRead();
            }
        },
    };
}
