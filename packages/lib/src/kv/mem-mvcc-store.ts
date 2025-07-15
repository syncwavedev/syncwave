import createTree, {type Iterator, type Tree} from 'functional-red-black-tree';
import {decodeBase64} from '../base64.js';
import {TXN_RETRIES_COUNT} from '../constants.js';
import {context} from '../context.js';
import {toCursor} from '../cursor.js';
import {AppError} from '../errors.js';
import {decodeHex} from '../hex.js';
import {Mutex} from '../mutex.js';
import {
    assert,
    compareUint8Array,
    unreachable,
    zip,
    type Brand,
} from '../utils.js';
import {
    mapCondition,
    type Condition,
    type Entry,
    type Snapshot,
    type Uint8Entry,
    type Uint8KvStore,
    type Uint8Snapshot,
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

interface ValueHolder<T> {
    readonly value: T;
}

type WriteSet = Tree<Uint8Array, ValueHolder<Uint8Array | undefined>>;

function toIter<V>(
    iter: Iterator<Uint8Array, V>,
    forward: boolean
): AsyncIterator<Entry<Uint8Array, V>> {
    let fresh = true;
    return {
        next: async () => {
            if (fresh) {
                fresh = false;
            } else if (forward) {
                iter.next();
            } else {
                iter.prev();
            }

            if (iter.valid) {
                return {
                    done: false as const,
                    value: {
                        key: iter.key!,
                        value: iter.value!,
                    },
                };
            }

            return {done: true as const, value: undefined};
        },
    };
}

export class MemMvccSnapshot implements Uint8Snapshot {
    keysRead = 0;
    keysReturned = 0;

    get base() {
        return undefined;
    }

    constructor(private readonly snapshot: Tree<Uint8Array, Uint8Array>) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        this.keysRead += 1;
        this.keysReturned += 1;
        return this.snapshot.get(key) ?? undefined;
    }

    async *query(
        condition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const iter = mapCondition(condition, {
            gt: cond => toIter(this.snapshot.gt(cond.gt), true),
            gte: cond => toIter(this.snapshot.ge(cond.gte), true),
            lt: cond => toIter(this.snapshot.lt(cond.lt), false),
            lte: cond => toIter(this.snapshot.le(cond.lte), false),
        });

        for await (const entry of toCursor(iter)) {
            this.keysRead += 1;
            context().ensureActive();

            if (entry.value !== undefined) {
                this.keysReturned += 1;
                yield entry;
            }
        }
    }
}

export class MvccTransaction implements Uint8Transaction {
    public writeSet: WriteSet = createTree(compareUint8Array);
    public readonly readRanges: KeyRange[] = [];

    keysRead = 0;
    keysReturned = 0;

    get base() {
        return this.snapshot;
    }

    constructor(private readonly snapshot: Snapshot<Uint8Array, Uint8Array>) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        this.readRanges.push({
            lower: {key, inclusive: true},
            upper: {key, inclusive: true},
        });
        const writeSetValue = this.writeSet.get(key);
        if (writeSetValue) {
            return writeSetValue.value;
        }

        this.keysRead += 1;
        this.keysReturned += 1;

        return (await this.snapshot.get(key)) ?? undefined;
    }

    async *query(
        condition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const [localIter, forwardQuery] = mapCondition(condition, {
            gt: cond => [toIter(this.writeSet.gt(cond.gt), true), true],
            gte: cond => [toIter(this.writeSet.ge(cond.gte), true), true],
            lt: cond => [toIter(this.writeSet.lt(cond.lt), false), false],
            lte: cond => [toIter(this.writeSet.le(cond.lte), false), false],
        });

        const readRangeStart = mapCondition<Uint8Array, Bound>(condition, {
            gt: cond => ({key: cond.gt, inclusive: false}),
            gte: cond => ({key: cond.gte, inclusive: true}),
            lt: cond => ({key: cond.lt, inclusive: false}),
            lte: cond => ({key: cond.lte, inclusive: true}),
        });

        const snapIterRaw = this.snapshot
            .query(condition)
            [Symbol.asyncIterator]();

        let snapIterKeyMax: Uint8Array | undefined = readRangeStart.key;
        const snapIter: AsyncIterator<Uint8Entry> = {
            next: async () => {
                const result = await snapIterRaw.next();
                if (result.done) {
                    snapIterKeyMax = undefined;
                } else {
                    this.keysRead += 1;
                    snapIterKeyMax = result.value.key;
                }

                return result;
            },
        };

        try {
            for await (const entry of mergeIterators(
                snapIter,
                localIter,
                (a, b) =>
                    forwardQuery
                        ? compareUint8Array(a, b)
                        : compareUint8Array(b, a)
            )) {
                context().ensureActive();

                if (entry.value !== undefined) {
                    this.keysReturned += 1;
                    yield entry;
                }
            }
        } finally {
            const readRangeEnd = {key: snapIterKeyMax, inclusive: true};
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

class AsyncIteratorAdapter<K, V> {
    static async from<K, V>(
        iter: AsyncIterator<Entry<K, V>>
    ): Promise<AsyncIteratorAdapter<K, V>> {
        const result = await iter.next();
        if (result.done) {
            return new AsyncIteratorAdapter(
                iter,
                result.done,
                undefined,
                undefined
            );
        }

        return new AsyncIteratorAdapter(
            iter,
            false,
            result.value.key,
            result.value.value
        );
    }

    private constructor(
        private readonly iter: AsyncIterator<Entry<K, V>>,
        private done: boolean,
        private _key: K | undefined,
        private _value: V | undefined
    ) {}

    get valid() {
        return !this.done;
    }

    get key() {
        return this._key;
    }

    get value() {
        return this._value;
    }

    async advance() {
        if (this.done) {
            return;
        }

        const result = await this.iter.next();
        if (result.done) {
            this.done = true;
            this._key = undefined;
            this._value = undefined;
        } else {
            this._key = result.value.key;
            this._value = result.value.value;
        }
    }
}

async function* mergeIterators(
    snap: AsyncIterator<Uint8Entry>,
    local: AsyncIterator<
        Entry<Uint8Array, ValueHolder<Uint8Array | undefined>>
    >,
    cmp: (a: Uint8Array, b: Uint8Array) => number
): AsyncIterable<Uint8Entry> {
    const snapIter = await AsyncIteratorAdapter.from(snap);
    const localIter = await AsyncIteratorAdapter.from(local);
    while (snapIter.valid || localIter.valid) {
        if (snapIter.valid && localIter.valid) {
            const snapIterKey = snapIter.key!;
            const snapIterValue = snapIter.value!;
            const localIterKey = localIter.key!;
            const localIterValue = localIter.value!;

            const cmpSnapLocal = cmp(snapIterKey, localIterKey);
            if (cmpSnapLocal === 0) {
                if (localIterValue.value !== undefined) {
                    yield {
                        key: localIterKey,
                        value: localIterValue.value,
                    };
                }
                await snapIter.advance();
                await localIter.advance();
            } else {
                if (cmpSnapLocal < 0) {
                    yield {key: snapIterKey, value: snapIterValue};
                    await snapIter.advance();
                } else {
                    if (localIterValue.value !== undefined) {
                        yield {
                            key: localIterKey,
                            value: localIterValue.value,
                        };
                    }
                    await localIter.advance();
                }
            }
        } else if (snapIter.valid) {
            yield {key: snapIter.key!, value: snapIter.value!};
            await snapIter.advance();
        } else if (localIter.valid) {
            if (localIter.value?.value !== undefined) {
                yield {key: localIter.key!, value: localIter.value.value};
            }
            await localIter.advance();
        }
    }
}

interface WriteEntry {
    readonly key: Uint8Array;
    readonly version: MvccVersion;
}

export interface MemMvccKvStoreOptions {
    readonly conflictRetryCount: number;
}

export type MvccVersion = Brand<number, 'mvcc_version'>;
export function toMvccVersion(version: number): MvccVersion {
    return version as MvccVersion;
}
export function incrementMvccVersion(version: MvccVersion): MvccVersion {
    return toMvccVersion(version + 1);
}

export abstract class ExclusiveMvccStore implements Uint8KvStore {
    private version = 1 as MvccVersion;
    private commited: WriteEntry[] = [];
    private running: MvccVersion[] = [];
    private closed = false;
    private commitMutex = new Mutex();

    private readonly options: MemMvccKvStoreOptions;

    constructor(options: Partial<MemMvccKvStoreOptions> = {}) {
        this.options = Object.assign(
            {
                conflictRetryCount: TXN_RETRIES_COUNT,
            } satisfies MemMvccKvStoreOptions,
            options
        );
    }

    abstract snapshot<R>(
        fn: (snapshot: Uint8Snapshot) => Promise<R>
    ): Promise<R>;

    async transact<R>(fn: (tx: Uint8Transaction) => Promise<R>): Promise<R> {
        this.ensureOpen();
        for (
            let attempt = 0;
            attempt <= this.options.conflictRetryCount;
            attempt += 1
        ) {
            const txVersion = this.version;
            this.running.push(txVersion);

            try {
                return await this.snapshot(async snap => {
                    const tx = new MvccTransaction(snap);

                    const result = await fn(tx);

                    this.ensureOpen();

                    if (tx.writeSet.length > 0) {
                        await this.commitMutex.run(async () => {
                            ensureSerializable(
                                txVersion,
                                tx.readRanges,
                                attempt + 1,
                                this.commited
                            );
                            await this.commit(tx.writeSet);
                        });
                    }

                    return result;
                });
            } catch (error) {
                if (
                    attempt === this.options.conflictRetryCount ||
                    !(error instanceof MvccConflictError)
                ) {
                    throw error;
                }
            } finally {
                const runningIndex = this.running.indexOf(txVersion);
                if (runningIndex !== -1) {
                    this.running.splice(runningIndex, 1);
                }

                this.gc();
            }
        }

        unreachable();
    }

    close(_reason: unknown): void {
        this.closed = true;
        // no resources to close
    }

    private ensureOpen() {
        if (this.closed) {
            throw new AppError('MvccKvStore is closed');
        }
    }

    protected abstract atomicWrite(
        puts: Uint8Entry[],
        deletes: Uint8Array[]
    ): Promise<void>;

    /**
     * call to commit must be protected by `commitMutex`
     */
    private async commit(writeSet: WriteSet) {
        let puts: Uint8Entry[] = [];
        let deletes: Uint8Array[] = [];
        for (const [key, {value}] of zip(writeSet.keys, writeSet.values)) {
            if (value === undefined) {
                deletes.push(key);
            } else {
                puts.push({key, value});
            }
        }

        await this.atomicWrite(puts, deletes);

        this.version = (this.version + 1) as MvccVersion;
        this.commited.push(
            ...writeSet.keys.map(key => ({
                version: this.version,
                key,
            }))
        );
    }

    private gc() {
        // GC: commited tx can only cause conflicts for transactions that started before it got commited
        this.commited = this.commited.filter(({version}) =>
            this.running.some(readVersion => readVersion < version)
        );
    }
}

export class MemMvccStore extends ExclusiveMvccStore {
    private tree: Tree<Uint8Array, Uint8Array> = createTree(compareUint8Array);

    constructor(options: Partial<MemMvccKvStoreOptions> = {}) {
        super(options);
    }

    async snapshot<R>(fn: (snapshot: Uint8Snapshot) => Promise<R>): Promise<R> {
        return await fn(new MemMvccSnapshot(this.tree));
    }

    protected override atomicWrite(
        puts: Uint8Entry[],
        deletes: Uint8Array[]
    ): Promise<void> {
        const uniqueKeys = new Set(
            puts
                .map(({key}) => key)
                .concat(deletes)
                .map(decodeBase64)
        );
        assert(
            uniqueKeys.size === puts.length + deletes.length,
            'Duplicate keys in puts + deletes'
        );

        for (const {key, value} of puts) {
            this.tree = this.tree.remove(key).insert(key, value);
        }

        for (const key of deletes) {
            this.tree = this.tree.remove(key);
        }

        return Promise.resolve();
    }
}

export class MvccConflictError extends AppError {}

export function ensureSerializable(
    readVersion: MvccVersion,
    readRanges: KeyRange[],
    attempt: number,
    commited: WriteEntry[],
    log = false
) {
    const conflicts: [
        version: number,
        lower: Bound,
        key: Uint8Array,
        upper: Bound,
    ][] = [];

    for (const {version, key} of commited) {
        if (version <= readVersion) {
            continue;
        }

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
                conflicts.push([version, range.lower, key, range.upper]);
            }
        }
    }

    if (conflicts.length > 0) {
        const conflictMessages: string[] = [];
        for (const [version, min, key, max] of conflicts) {
            conflictMessages.push(
                `- ${version}: read range = ${stringifyBound(min, max)}, write key = ${decodeHex(key)}`
            );
        }

        throw new MvccConflictError(
            `MvccKvStore transaction (read version = ${readVersion}, attempt = ${attempt}) conflict detected:\n${conflictMessages.join(
                '\n'
            )}`
        );
    }
}

function stringifyBound(
    start: Bound | undefined,
    end: Bound | undefined
): string {
    const result: string[] = [];
    if (start?.key) {
        result.push(start.inclusive ? '[' : '(');
        result.push(decodeHex(start.key));
    } else {
        result.push('(-inf');
    }
    result.push(', ');
    if (end?.key) {
        result.push(decodeHex(end.key));
        result.push(end.inclusive ? ']' : ')');
    } else {
        result.push('inf)');
    }

    return result.join('');
}
