import createTree, {type Iterator, type Tree} from 'functional-red-black-tree';
import {encodeMsgpack} from '../codec.js';
import {TXN_RETRIES_COUNT} from '../constants.js';
import {context} from '../context.js';
import {AppError} from '../errors.js';
import {toStream} from '../stream.js';
import {compareUint8Array, unreachable, zip} from '../utils.js';
import {
    type Condition,
    type Entry,
    InvalidQueryCondition,
    type Transaction,
    type Uint8MvccStore,
    type Uint8Transaction,
} from './kv-store.js';

interface Bound {
    key: Uint8Array | undefined;
    inclusive: boolean;
}

interface KeyRange {
    lower: Bound;
    upper: Bound;
}

type WriteSet = Tree<Uint8Array, {readonly value: Uint8Array | undefined}>;

export class MemMvccTransaction implements Uint8Transaction {
    public writeSet: WriteSet = createTree(compareUint8Array);
    public readonly readRanges: KeyRange[] = [];

    constructor(private readonly snapshot: Tree<Uint8Array, Uint8Array>) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        this.readRanges.push({
            lower: {key, inclusive: true},
            upper: {key, inclusive: true},
        });
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
        let readRangeStart: Bound;

        if (condition.gt) {
            readRangeStart = {key: condition.gt, inclusive: false};
            snapIter = this.snapshot.gt(condition.gt);
            localIter = this.writeSet.gt(condition.gt);
            forwardQuery = true;
        } else if (condition.gte) {
            readRangeStart = {key: condition.gte, inclusive: true};
            snapIter = this.snapshot.ge(condition.gte);
            localIter = this.writeSet.ge(condition.gte);
            forwardQuery = true;
        } else if (condition.lt) {
            readRangeStart = {key: condition.lt, inclusive: false};
            snapIter = this.snapshot.lt(condition.lt);
            localIter = this.writeSet.lt(condition.lt);
            forwardQuery = false;
        } else if (condition.lte) {
            readRangeStart = {key: condition.lte, inclusive: true};
            snapIter = this.snapshot.le(condition.lte);
            localIter = this.writeSet.le(condition.lte);
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

        const cmpMultiplier = forwardQuery ? 1 : -1;

        function furthestBound(a: Bound, b: Bound): Bound {
            if (a.key !== undefined && b.key !== undefined) {
                const cmpResult =
                    compareUint8Array(a.key, b.key) * cmpMultiplier;
                if (cmpResult > 0) {
                    return a;
                } else if (cmpResult < 0) {
                    return b;
                } else if (a.inclusive) {
                    return a;
                } else {
                    return b;
                }
            }

            return {key: undefined, inclusive: false};
        }

        try {
            while (snapIter.valid || localIter.valid) {
                context().ensureActive();

                if (snapIter.valid && localIter.valid) {
                    const snapIterKey = snapIter.key!;
                    const snapIterValue = snapIter.value!;
                    const localIterKey = localIter.key!;
                    const localIterValue = localIter.value!;

                    const cmpSnapLocal =
                        compareUint8Array(snapIterKey, localIterKey) *
                        cmpMultiplier;
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
                        yield {
                            key: localIter.key!,
                            value: localIter.value!.value,
                        };
                    }
                    advance(localIter);
                }
            }
        } finally {
            const readRangeEnd = {key: snapIter.key, inclusive: true};
            if (forwardQuery) {
                this.readRanges.push({
                    lower: readRangeStart,
                    upper: readRangeEnd,
                });
            } else {
                this.readRanges.push({
                    lower: readRangeEnd,
                    upper: readRangeStart,
                });
            }
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

interface RunningTx {
    readonly readVersion: number;
}

interface CommitedTx {
    readonly version: number;
    readonly writeSet: Uint8Array[];
}

export interface MemMvccKvStoreOptions {
    readonly transactionRetryCount: number;
}

export class MemMvccStore implements Uint8MvccStore {
    private version = 1;
    private commited: CommitedTx[] = [];
    private running: RunningTx[] = [];
    private closed = false;

    private tree: Tree<Uint8Array, Uint8Array> = createTree(compareUint8Array);

    private readonly options: MemMvccKvStoreOptions;

    constructor(options: Partial<MemMvccKvStoreOptions> = {}) {
        this.options = Object.assign(
            {
                transactionRetryCount: TXN_RETRIES_COUNT,
            } satisfies MemMvccKvStoreOptions,
            options
        );
    }

    async snapshot(): Promise<Uint8Array> {
        return await this.transact(async tx => {
            const entries = await toStream(
                tx.query({gte: new Uint8Array()})
            ).toArray();

            return encodeMsgpack(entries);
        });
    }

    async transact<TResult>(
        fn: (tx: Transaction<Uint8Array, Uint8Array>) => Promise<TResult>
    ): Promise<TResult> {
        this.ensureOpen();
        for (
            let attempt = 0;
            attempt <= this.options.transactionRetryCount;
            attempt += 1
        ) {
            const runningTx = {readVersion: this.version};
            this.running.push(runningTx);

            try {
                const tx = new MemMvccTransaction(this.tree);

                const result = await fn(tx);

                this.ensureOpen();

                if (tx.writeSet.length > 0) {
                    this.ensureSerializable(
                        runningTx.readVersion,
                        tx.readRanges,
                        attempt + 1
                    );
                    this.commit(tx.writeSet);
                }

                return result;
            } catch (error) {
                if (attempt === this.options.transactionRetryCount) {
                    throw error;
                }
            } finally {
                this.running = this.running.filter(x => x !== runningTx);
                this.gc();
            }
        }

        unreachable();
    }

    close(): void {
        this.closed = true;
        // no resources to close
    }

    private ensureOpen() {
        if (this.closed) {
            throw new AppError('MvccKvStore is closed');
        }
    }

    private ensureSerializable(
        readVersion: number,
        readRanges: KeyRange[],
        attempt: number
    ) {
        const conflicts: [
            version: number,
            lower: Bound,
            key: Uint8Array,
            upper: Bound,
        ][] = [];

        for (const {version, writeSet} of this.commited) {
            if (version <= readVersion) {
                continue;
            }

            for (const key of writeSet) {
                for (const range of readRanges) {
                    const check = (a: number, lte: boolean) => {
                        if (lte) {
                            return a <= 0;
                        }

                        return a < 0;
                    };
                    if (
                        (range.lower.key === undefined ||
                            check(
                                compareUint8Array(range.lower.key, key),
                                range.lower.inclusive
                            )) &&
                        (range.upper.key === undefined ||
                            check(
                                compareUint8Array(key, range.upper.key),
                                range.upper.inclusive
                            ))
                    ) {
                        conflicts.push([
                            version,
                            range.lower,
                            key,
                            range.upper,
                        ]);
                    }
                }
            }
        }

        if (conflicts.length > 0) {
            const conflictMessages: string[] = [];
            for (const [version, min, key, max] of conflicts) {
                conflictMessages.push(
                    `- ${version}: ${min?.toString()}, ${key.toString()}, ${max?.toString()}`
                );
            }

            throw new MvccConflictError(
                `MvccKvStore transaction (read version = ${readVersion}, attempt = ${attempt}) conflict detected:\n${conflictMessages.join(
                    '\n'
                )}`
            );
        }
    }

    private commit(writeSet: WriteSet) {
        for (const [key, {value}] of zip(writeSet.keys, writeSet.values)) {
            if (value === undefined) {
                this.tree = this.tree.remove(key);
            } else {
                this.tree = this.tree.remove(key).insert(key, value);
            }
        }

        this.version += 1;
        this.commited.push({
            version: this.version,
            writeSet: writeSet.keys,
        });
    }

    private gc() {
        // GC: commited tx can only cause conflicts for transactions that started before it got commited
        this.commited = this.commited.filter(({version}) =>
            this.running.some(({readVersion}) => readVersion < version)
        );
    }
}

export class MvccConflictError extends AppError {}
