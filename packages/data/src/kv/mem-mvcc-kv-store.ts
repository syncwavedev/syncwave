import createTree, {Iterator, Tree} from 'functional-red-black-tree';
import {TXN_RETRIES_COUNT} from '../constants.js';
import {context} from '../context.js';
import {AppError} from '../errors.js';
import {compareUint8Array, unreachable, zip} from '../utils.js';
import {
    Condition,
    Entry,
    InvalidQueryCondition,
    Transaction,
    Uint8KVStore,
    Uint8Transaction,
} from './kv-store.js';

interface KeyRange {
    min: Uint8Array | undefined;
    max: Uint8Array | undefined;
}

export class MemMvccKvTransaction implements Uint8Transaction {
    public writeSet: Tree<
        Uint8Array,
        {readonly value: Uint8Array | undefined}
    > = createTree(compareUint8Array);
    public readonly readRanges: KeyRange[] = [];

    constructor(private readonly snapshot: Tree<Uint8Array, Uint8Array>) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        this.readRanges.push({min: key, max: key});
        const local = this.writeSet.get(key);
        if (local) {
            return local.value;
        }

        return this.snapshot.get(key) ?? undefined;
    }
    async *query(
        condition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        let snapIter: Iterator<Uint8Array, Uint8Array>;
        let localIter: Iterator<
            Uint8Array,
            {readonly value: Uint8Array | undefined}
        >;
        let forwardQuery: boolean;
        let readRangeStart: Uint8Array;

        if (condition.gt) {
            readRangeStart = condition.gt;
            snapIter = this.snapshot.gt(readRangeStart);
            localIter = this.writeSet.gt(readRangeStart);
            forwardQuery = true;
        } else if (condition.gte) {
            readRangeStart = condition.gte;
            snapIter = this.snapshot.ge(readRangeStart);
            localIter = this.writeSet.ge(readRangeStart);
            forwardQuery = true;
        } else if (condition.lt) {
            readRangeStart = condition.lt;
            snapIter = this.snapshot.lt(readRangeStart);
            localIter = this.writeSet.lt(readRangeStart);
            forwardQuery = false;
        } else if (condition.lte) {
            readRangeStart = condition.lte;
            snapIter = this.snapshot.le(readRangeStart);
            localIter = this.writeSet.le(readRangeStart);
            forwardQuery = false;
        } else {
            throw new InvalidQueryCondition(condition);
        }

        function advance<T>(iter: Iterator<Uint8Array, T>) {
            if (forwardQuery) {
                iter.next();
            } else {
                iter.prev();
            }
        }

        function maxKey(
            a: Uint8Array | undefined,
            b: Uint8Array | undefined
        ): Uint8Array | undefined {
            if (a !== undefined && b !== undefined) {
                return compareUint8Array(a!, b!) > 0 ? a : b;
            }

            return undefined;
        }

        let readRangeEnd: Uint8Array | undefined = maxKey(
            snapIter.key,
            localIter.key
        );
        while (snapIter.valid || localIter.valid) {
            readRangeEnd = maxKey(snapIter.key, localIter.key);

            context().ensureActive();

            if (snapIter.valid && localIter.valid) {
                const snapIterKey = snapIter.key!;
                const snapIterValue = snapIter.value!;
                const localIterKey = localIter.key!;
                const localIterValue = localIter.value!;

                const cmpSnapLocal =
                    compareUint8Array(snapIterKey, localIterKey) *
                    (forwardQuery ? 1 : -1);
                if (cmpSnapLocal === 0) {
                    if (localIterValue.value !== undefined) {
                        yield {
                            key: localIterKey,
                            value: localIterValue.value,
                        };
                    }
                    advance(snapIter);
                    advance(localIter);
                } else {
                    if (cmpSnapLocal < 0) {
                        yield {key: snapIterKey, value: snapIterValue};
                        advance(snapIter);
                    } else {
                        if (localIterValue.value !== undefined) {
                            yield {
                                key: localIterKey,
                                value: localIterValue.value,
                            };
                        }
                        advance(localIter);
                    }
                }
            } else if (snapIter.valid) {
                yield {key: snapIter.key!, value: snapIter.value!};
                advance(snapIter);
            } else if (localIter.valid) {
                if (localIter.value!.value !== undefined) {
                    yield {key: localIter.key!, value: localIter.value!.value};
                }
                advance(localIter);
            }
        }

        if (forwardQuery) {
            this.readRanges.push({min: readRangeStart, max: readRangeEnd});
        } else {
            this.readRanges.push({min: readRangeEnd, max: readRangeStart});
        }
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        this.writeSet = this.writeSet.remove(key).insert(key, {value});
    }

    async delete(key: Uint8Array): Promise<void> {
        this.writeSet = this.writeSet
            .remove(key)
            .insert(key, {value: undefined});
    }
}

export class MemMvccKvStore implements Uint8KVStore {
    private readonly writeLog: Uint8Array[][] = [];

    private tree: Tree<Uint8Array, Uint8Array> = createTree(compareUint8Array);

    async transact<TResult>(
        fn: (tx: Transaction<Uint8Array, Uint8Array>) => Promise<TResult>
    ): Promise<TResult> {
        for (let attempt = 0; attempt <= TXN_RETRIES_COUNT; attempt += 1) {
            try {
                const readVersion = this.writeLog.length;
                const tx = new MemMvccKvTransaction(this.tree);

                const result = await fn(tx);

                for (
                    let version = readVersion;
                    version < this.writeLog.length;
                    version += 1
                ) {
                    const writeSet = this.writeLog[version];

                    for (const key of writeSet) {
                        for (const range of tx.readRanges) {
                            if (
                                (range.min === undefined ||
                                    compareUint8Array(range.min, key) <= 0) &&
                                (range.max === undefined ||
                                    compareUint8Array(key, range.max) <= 0)
                            ) {
                                throw new AppError('MVCC: read-write conflict');
                            }
                        }
                    }
                }

                for (const [key, {value}] of zip(
                    tx.writeSet.keys,
                    tx.writeSet.values
                )) {
                    if (value === undefined) {
                        this.tree = this.tree.remove(key);
                    } else {
                        this.tree = this.tree.remove(key).insert(key, value);
                    }
                }

                this.writeLog.push(tx.writeSet.keys);

                return result;
            } catch (error) {
                if (attempt === TXN_RETRIES_COUNT) {
                    throw error;
                }
            }
        }

        unreachable();
    }
    close(): void {
        throw new AppError('Method not implemented.');
    }
}
