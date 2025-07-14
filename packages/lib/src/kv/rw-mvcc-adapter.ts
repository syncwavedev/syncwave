import {MsgpackCodec} from '../codec.js';
import {AppError} from '../errors.js';
import {log} from '../logger.js';
import {Stream, toStream} from '../stream.js';
import {getNow, type Timestamp} from '../timestamp.js';
import {
    NumberPacker,
    stringifyTuple,
    type Packer,
    type Tuple,
} from '../tuple.js';
import {
    assert,
    camelCaseToSnakeCase,
    compareUint8Array,
    partition,
    pipe,
    toObject,
    unreachable,
    whenAll,
    zip,
} from '../utils.js';
import {createUuidV4, Uuid, validateUuid} from '../uuid.js';
import type {Snapshot} from './kv-store.js';
import {
    interceptSnapshot,
    isolate,
    isolateSnapshot,
    mapCondition,
    withCodec,
    withPacker,
    withSnapshotCodec,
    withSnapshotPacker,
    type Condition,
    type KvStore,
    type Transaction,
    type Uint8Entry,
} from './kv-store.js';
import {
    ensureSerializable,
    incrementMvccVersion,
    MvccConflictError,
    MvccTransaction,
    toMvccVersion,
    type MvccVersion,
} from './mem-mvcc-store.js';
import {TupleStore} from './tuple-store.js';

export class MvccSnapshotAdapter implements Snapshot<Uint8Array, Uint8Array> {
    keysReturned = 0;
    keysRead = 0;
    notReturnedBecauseDidNotMatch = 0;
    notReturnedBecauseTombstone = 0;
    notReturnedBecauseVersionInFuture = 0;
    notReturnedBecauseVersionOverridden = 0;
    notReturnedBecauseDidNotAskForIt = 0;

    get base() {
        return undefined;
    }

    constructor(
        private readonly adapter: MvccAdapter,
        private readonly readVersion: number,
        public readonly key: MvccSnapshotKey
    ) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        return await this.adapter._read(this.key, async tx => {
            const {data: snapshot} = tx;
            for await (const {
                key: [entryKey, version, deleted],
                value,
            } of snapshot.query({
                lte: [key, this.readVersion, true],
            })) {
                this.keysRead += 1;

                const cmpResult = compareUint8Array(entryKey, key);
                assert(cmpResult <= 0, 'Invalid key: must be lte');

                if (cmpResult !== 0) {
                    this.notReturnedBecauseDidNotMatch += 1;
                    return undefined;
                }

                assert(
                    version <= this.readVersion,
                    'Invalid version: must be lte'
                );

                if (deleted) {
                    this.notReturnedBecauseTombstone += 1;
                    return undefined;
                }

                this.keysReturned += 1;
                return value;
            }

            return undefined;
        });
    }

    async *query(condition: Condition<Uint8Array>): AsyncIterable<Uint8Entry> {
        let cond = mapCondition<Uint8Array, Condition<DataKey>>(condition, {
            gt: cond => ({gt: [cond.gt, Number.MAX_SAFE_INTEGER, true]}),
            gte: cond => ({gte: [cond.gte, 0, false]}),
            lt: cond => ({lt: [cond.lt, 0, false]}),
            lte: cond => ({lte: [cond.lte, this.readVersion, true]}),
        });

        const forward = cond.gt !== undefined || cond.gte !== undefined;

        let lastObservedEntry:
            | {key: Uint8Array; value: Uint8Array | undefined}
            | undefined = undefined;

        while (true) {
            const entries = await this.adapter._read(
                this.key,
                async ({data: snapshot}) =>
                    await toStream(snapshot.query(cond))
                        .take(this.adapter.options.queryBatchSize)
                        .toArray()
            );

            if (entries.length === 0) break;

            const last = entries[entries.length - 1];
            cond = mapCondition<Uint8Array, Condition<DataKey>>(condition, {
                gt: () => ({gt: last.key}),
                gte: () => ({gt: last.key}),
                lt: () => ({lt: last.key}),
                lte: () => ({lt: last.key}),
            });

            this.keysRead += entries.length;
            this.notReturnedBecauseDidNotAskForIt += entries.length;

            for (const {
                key: [key, version, deleted],
                value,
            } of entries) {
                this.notReturnedBecauseDidNotAskForIt -= 1;

                if (version > this.readVersion) {
                    this.notReturnedBecauseVersionInFuture += 1;
                    continue;
                }

                // skip invalid entries during the beginning of the iteration
                if (lastObservedEntry === undefined) {
                    const isKeyMatches = mapCondition<Uint8Array, boolean>(
                        condition,
                        {
                            gt: cond => compareUint8Array(key, cond.gt) > 0,
                            gte: cond => compareUint8Array(key, cond.gte) >= 0,
                            lt: cond => compareUint8Array(key, cond.lt) < 0,
                            lte: cond => compareUint8Array(key, cond.lte) <= 0,
                        }
                    );

                    if (!isKeyMatches) {
                        this.notReturnedBecauseDidNotMatch += 1;
                        continue;
                    }
                }

                if (forward) {
                    // detect key change, that means that we got to the end of
                    // the current key versions and can safely yield
                    if (
                        lastObservedEntry &&
                        compareUint8Array(key, lastObservedEntry.key) !== 0
                    ) {
                        if (lastObservedEntry.value) {
                            this.keysReturned += 1;
                            yield {
                                key: lastObservedEntry.key,
                                value: lastObservedEntry.value,
                            };
                        } else {
                            this.notReturnedBecauseTombstone += 1;
                        }
                    } else {
                        this.notReturnedBecauseVersionOverridden += 1;
                    }
                } else {
                    if (
                        lastObservedEntry === undefined ||
                        compareUint8Array(key, lastObservedEntry.key) !== 0
                    ) {
                        if (!deleted) {
                            this.keysReturned += 1;
                            yield {key, value};
                        } else {
                            this.notReturnedBecauseTombstone += 1;
                        }
                    } else {
                        this.notReturnedBecauseVersionOverridden += 1;
                    }
                }

                lastObservedEntry = {
                    key,
                    value: deleted ? undefined : value,
                };
            }
        }

        if (forward && lastObservedEntry?.value) {
            this.keysReturned += 1;
            this.notReturnedBecauseVersionOverridden -= 1;
            yield {
                key: lastObservedEntry.key,
                value: lastObservedEntry.value,
            };
        }
    }
}

type DataKey = [key: Uint8Array, version: number, deleted: boolean];

interface ReadSuite {
    readonly data: Snapshot<DataKey, Uint8Array>;
    readonly log: Snapshot<LogKey, Uint8Array>;
    readonly version: Snapshot<VersionKey, number>;
    readonly activeTransactions: Snapshot<MvccSnapshotKey, Timestamp>;
    readonly gcScanOffset: Snapshot<GcOffsetKey, DataKey>;
    readonly rawStore: Snapshot<Tuple, Uint8Array>;
}

type LogKey = readonly [commitVersion: MvccVersion, writeKeyIndex: number];
type MvccSnapshotKey = readonly [readVersion: MvccVersion, transactionId: Uuid];
type VersionKey = readonly [];
type GcOffsetKey = number;

const MIN_DATA_KEY: DataKey = [new Uint8Array(), 0, false];

interface WriteSuite {
    readonly data: Transaction<DataKey, Uint8Array>;
    readonly log: Transaction<LogKey, Uint8Array>;
    readonly version: Transaction<VersionKey, number>;
    readonly activeTransactions: Transaction<MvccSnapshotKey, Timestamp>;
    readonly gcScanOffset: Transaction<GcOffsetKey, DataKey>;
    readonly rawStore: Transaction<Tuple, Uint8Array>;
}

export interface MvccAdapterGcOptions {
    readonly staleTransactionAgeMs: number;
    readonly transactionThresholdVersions: number;
}

export interface MvccAdapterOptions {
    readonly conflictRetryCount: number;
    readonly queryBatchSize: number;
    readonly syncGc: boolean;
}

// the perfect scan size should be small to prevent long GC pauses
// and big enough to make GC efficient
const PERFECT_GC_SCAN_SIZE = 128;
// we wanna have multiple offsets to prevent concurrent GCs scanning the same key range
const GC_OFFSETS = 8;
// abort snapshots that are 5s old and 128 read versions behind
const STALE_SNAPSHOT_AGE_MS = 5 * 1000;
const STALE_SNAPSHOT_VERSIONS_BEHIND = 32;

export class MvccAdapter implements KvStore<Uint8Array, Uint8Array> {
    private readonly store: KvStore<Tuple, Uint8Array>;
    public readonly options: MvccAdapterOptions;
    // always start with GC in case if adapter is recreated frequently
    private writtenCount = PERFECT_GC_SCAN_SIZE;
    private readCount = 0;
    // randomized set of recently read keys, GC'll clean up one of those keys on run
    private lastRead: {key: DataKey; forward: boolean} | undefined;
    private sessionGcScanOffsetKey = Math.trunc(Math.random() * GC_OFFSETS);

    private sessionWrittenCount = 0;
    private sessionGcScannedCount = 0;
    private sessionGcRollOverCount = 0;
    private gcEpochStart: Timestamp = getNow();
    private gcEpochStaleSnapshots = 0;
    private gcEpochFreshSnapshots = 0;
    private sessionGcEpochs = 0;

    private gcEpochNewKeys = 0;
    private gcEpochStaleKeys = 0;
    private gcEpochScannedKeys = 0;

    constructor(
        store: KvStore<Uint8Array, Uint8Array>,
        options: Partial<MvccAdapterOptions> = {}
    ) {
        this.options = {
            conflictRetryCount: Number.MAX_SAFE_INTEGER,
            queryBatchSize: 32,
            syncGc: false,
            ...options,
        };
        this.store = new TupleStore(store);
    }

    async snapshot<TResult>(
        fn: (span: MvccSnapshotAdapter) => Promise<TResult>,
        options: {autoFree: boolean} = {
            autoFree: true,
        }
    ): Promise<TResult> {
        const readVersion = await this.getReadVersion();
        const snapKey: MvccSnapshotKey = [readVersion, createUuidV4()];
        try {
            await this._write(snapKey, tx =>
                this.startSnapshotLease(tx, snapKey)
            );
            const tx = new MvccSnapshotAdapter(this, readVersion, snapKey);

            const result = await fn(tx);

            log.trace({
                msg: `snapshot stats: retrieved = ${tx.keysRead}, returned = ${tx.keysReturned}`,
            });

            await this.reportTransactionStats({
                writtenCount: 0,
                readCount: this.readCount,
            });

            return result;
        } finally {
            if (options.autoFree) {
                this.endSnapshotLease(snapKey);
            }
        }
    }

    async transact<TResult>(
        fn: (tx: Transaction<Uint8Array, Uint8Array>) => Promise<TResult>
    ): Promise<TResult> {
        for (
            let attempt = 0;
            attempt <=
            (this.options.conflictRetryCount ?? Number.MAX_SAFE_INTEGER);
            attempt += 1
        ) {
            try {
                const [result, tx, snapKey] = await this.snapshot(
                    async snap => {
                        const tx = new MvccTransaction(snap);
                        const result = await fn(tx);

                        return [result, tx, snap.key];
                    },
                    {autoFree: false}
                );

                await this.commit(tx, snapKey, attempt);

                await this.reportTransactionStats({
                    writtenCount: tx.writeSet.length,
                    readCount: this.readCount,
                });

                return result;
            } catch (error) {
                if (
                    attempt === this.options.conflictRetryCount ||
                    !(error instanceof MvccConflictError)
                ) {
                    throw error;
                }
            }
        }

        unreachable();
    }

    private async reportTransactionStats(params: {
        writtenCount: number;
        readCount: number;
    }) {
        this.sessionWrittenCount += params.writtenCount;

        this.writtenCount += params.writtenCount;
        this.readCount += params.readCount;

        if (this.writtenCount >= PERFECT_GC_SCAN_SIZE) {
            const gcWrittenCount = this.writtenCount;
            this.writtenCount = 0;
            const gcPromise = this.gc(gcWrittenCount).catch(error => {
                log.error({
                    error,
                    msg: 'Failed to run GC',
                });
            });

            if (this.options.syncGc) {
                await gcPromise;
            }
        } else if (this.readCount >= PERFECT_GC_SCAN_SIZE * 8) {
            this.readCount = 0;
            const gcPromise = this.gc(PERFECT_GC_SCAN_SIZE).catch(error => {
                log.error({
                    error,
                    msg: 'Failed to run GC',
                });
            });

            if (this.options.syncGc) {
                await gcPromise;
            }
        }
    }

    private async startSnapshotLease(tx: WriteSuite, snapKey: MvccSnapshotKey) {
        await tx.activeTransactions.put(snapKey, getNow());
    }

    private endSnapshotLease(snapKey: MvccSnapshotKey) {
        this._write(
            undefined,
            async tx => await tx.activeTransactions.delete(snapKey)
        ).catch(error => {
            log.error({
                error,
                msg: 'Failed to record transaction end',
            });
        });
    }

    // transaction might get aborted by GC if it's running for too long
    private async _ensureSnapshotAlive(
        suite: ReadSuite,
        snapKey: MvccSnapshotKey
    ) {
        const runningTimestamp = await suite.activeTransactions.get(snapKey);
        if (runningTimestamp === undefined) {
            throw new AppError('Transaction aborted');
        }
    }

    private isSnapshotStale(versionsBehind: number, transactionAge: number) {
        return (
            versionsBehind > STALE_SNAPSHOT_VERSIONS_BEHIND &&
            transactionAge > STALE_SNAPSHOT_AGE_MS
        );
    }

    /**
     * Warning: scans all the data
     */
    async stats(): Promise<Record<string, number>> {
        return await this._read(undefined, async suite => {
            const totalKeys = await toStream(
                suite.rawStore.query({
                    gte: [],
                })
            ).count();

            const readVersion = (await suite.version.get([])) ?? 0;
            const now = getNow();

            let activeTransactions = 0;
            let oldestReadVersionInUse = toMvccVersion(Number.MAX_SAFE_INTEGER);
            let staleTransactions = 0;
            let sumVersionsBehind = 0;
            let sumTransactionAge = 0;

            for await (const {
                key: [txReadVersion],
                value,
            } of suite.activeTransactions.query({
                gte: [toMvccVersion(0), Uuid.min],
            })) {
                const txTimestamp = value;
                activeTransactions++;

                if (txReadVersion < oldestReadVersionInUse) {
                    oldestReadVersionInUse = txReadVersion;
                }

                const transactionAge = now - txTimestamp;
                sumTransactionAge += transactionAge;

                const versionsBehind = readVersion - txReadVersion;
                sumVersionsBehind += versionsBehind;
                if (this.isSnapshotStale(versionsBehind, transactionAge)) {
                    staleTransactions++;
                }
            }

            const averageActiveTransactionVersionsBehind =
                activeTransactions > 0
                    ? sumVersionsBehind / activeTransactions
                    : 0;
            const averageActiveTransactionAge =
                activeTransactions > 0
                    ? sumTransactionAge / activeTransactions
                    : 0;

            let totalDataKeys = 0;
            let totalDataTombstones = 0;

            for await (const {
                key: [, version, deleted],
            } of suite.data.query({
                gte: [] as unknown as DataKey,
            })) {
                totalDataKeys++;
                if (deleted) {
                    totalDataTombstones++;
                }
            }

            let staleDataKeys = 0;
            let staleDataTombstones = 0;

            for await (const [, , tombstone] of this._getStaleKeys(
                toStream(suite.data.query({gte: [] as unknown as DataKey})).map(
                    x => x.key
                ),
                oldestReadVersionInUse
            )) {
                staleDataKeys++;
                if (tombstone) {
                    staleDataTombstones++;
                }
            }

            const commitSets = await toStream(
                suite.log.query({gte: [] as unknown as LogKey})
            ).count();
            const gcOffsets = await toStream(
                suite.gcScanOffset.query({gte: 0})
            ).count();

            return toObject(
                Object.entries({
                    totalKeys: totalKeys,

                    commitSets,

                    totalDataKeys: totalDataKeys,
                    staleDataKeys: staleDataKeys,
                    staleDataRatio:
                        totalDataKeys > 0 ? staleDataKeys / totalDataKeys : 0,
                    totalDataTombstones: totalDataTombstones,
                    staleDataTombstones: staleDataTombstones,
                    observableDataTombstones:
                        totalDataTombstones - staleDataTombstones,

                    activeTransactions,
                    staleTransactions,
                    averageActiveTransactionVersionsBehind,
                    averageActiveTransactionAge,

                    readVersion,
                    oldestReadVersionInUse,
                    gcOffsets,

                    sessionWrittenCount: this.sessionWrittenCount,
                    sessionGcScannedCount: this.sessionGcScannedCount,
                    sessionGcRollOverCount: this.sessionGcRollOverCount,
                    sessionGcEpochs: this.sessionGcEpochs,

                    gcEpochAge: getNow() - this.gcEpochStart,

                    gcEpochStaleSnapshots: this.gcEpochStaleSnapshots,
                    gcEpochFreshSnapshots: this.gcEpochFreshSnapshots,

                    gcEpochNewKeys: this.gcEpochNewKeys,
                    gcEpochStaleKeys: this.gcEpochStaleKeys,
                    gcEpochScannedKeys: this.gcEpochScannedKeys,
                }).map(([key, value]) => [camelCaseToSnakeCase(key), value])
            );
        });
    }

    private async gc(writtenCount: number) {
        this.sessionGcEpochs += 1;
        this.gcEpochNewKeys = writtenCount;
        const [activeSnapshots, version] = await this._read(
            undefined,
            async suite => {
                const activeTransactions = await toStream(
                    suite.activeTransactions.query({
                        gte: [toMvccVersion(0), Uuid.min],
                    })
                ).toArray();
                const version = await suite.version.get([]);
                return [activeTransactions, toMvccVersion(version ?? 0)];
            }
        );

        // cleanup stale snapshots

        const now = getNow();
        this.gcEpochStart = now;

        const [staleSnaps, freshSnaps] = partition(
            activeSnapshots,
            ({key: [readVersion], value: ts}) =>
                this.isSnapshotStale(version - readVersion, now - ts)
        );
        this.gcEpochStaleSnapshots = staleSnaps.length;
        this.gcEpochFreshSnapshots = freshSnaps.length;

        if (staleSnaps.length > 0) {
            await this._write(undefined, async suite => {
                await whenAll(
                    staleSnaps.map(({key}) =>
                        suite.activeTransactions.delete(key)
                    )
                );
            });
        }

        // cleanup stale data

        const oldestReadVersionInUse: MvccVersion = toMvccVersion(
            Math.min(
                version,
                ...freshSnaps.map(({key: [readVersion]}) => readVersion)
            )
        );

        let gcScanOffset: DataKey;
        let forward: boolean;
        // we wanna make progress on both global and hot garbage
        if (Math.random() < 0.5 && this.lastRead) {
            gcScanOffset = this.lastRead.key;
            forward = this.lastRead.forward;
        } else {
            gcScanOffset = await this._read<DataKey>(undefined, async suite => {
                return (
                    (await suite.gcScanOffset.get(
                        this.sessionGcScanOffsetKey
                    )) ?? MIN_DATA_KEY
                );
            });
            forward = true;
        }

        const [nextGcScanOffset, staleKeys] = await this._read(
            undefined,
            async suite => {
                const keys = await toStream(
                    suite.data.query(
                        forward ? {gte: gcScanOffset} : {lte: gcScanOffset}
                    )
                )
                    .map(x => x.key)
                    .take(Math.max(PERFECT_GC_SCAN_SIZE, writtenCount * 2)) // multiply to stay ahead of the garbage
                    .toArray();

                if (!forward) {
                    keys.reverse();
                }

                this.sessionGcScannedCount += keys.length;
                this.gcEpochScannedKeys = keys.length;

                if (keys.length < PERFECT_GC_SCAN_SIZE) {
                    this.sessionGcRollOverCount += 1;
                    return [MIN_DATA_KEY, []];
                }

                const staleKeys = await toStream(
                    this._getStaleKeys(toStream(keys), oldestReadVersionInUse)
                ).toArray();

                return [keys[keys.length - 1], staleKeys];
            }
        );

        await this._write(undefined, async suite => {
            await suite.gcScanOffset.put(
                this.sessionGcScanOffsetKey,
                nextGcScanOffset
            );
        });

        this.gcEpochStaleKeys = staleKeys.length;

        if (staleKeys.length > 0) {
            await this._write(undefined, async suite => {
                await whenAll(staleKeys.map(key => suite.data.delete(key)));
            });
        }

        // cleanup stale logs

        const staleLogs: LogKey[] = [];
        await this._read(undefined, async suite => {
            for await (const {
                key: [version, index],
            } of suite.log.query({
                gte: [toMvccVersion(0), 0],
            })) {
                if (version < oldestReadVersionInUse) {
                    staleLogs.push([version, index]);
                }
            }
        });

        if (staleLogs.length > 0) {
            await this._write(undefined, async suite => {
                await whenAll(staleLogs.map(key => suite.log.delete(key)));
            });
        }
    }

    /**
     * Stale key is a key that can never be read by any running or future transaction.
     */
    private async *_getStaleKeys(
        keys: Stream<DataKey>,
        oldestReadVersionInUse: MvccVersion
    ) {
        const mappedKeys = keys
            .lookbehind()
            .lookahead()
            .map(x => ({
                current: x.item.item,
                previous: x.item.previous,
                next: x.next?.item,
            }));
        let prevKey: Uint8Array | undefined = undefined;
        for await (const {current, previous, next} of mappedKeys) {
            if (next === undefined || previous === undefined) {
                continue;
            }

            assert(
                compareUint8Array(current[0], previous[0]) >= 0,
                'Current key must be greater than or equal to previous key'
            );
            assert(
                compareUint8Array(current[0], next[0]) <= 0,
                'Current key must be less than or equal to next key'
            );

            if (prevKey === undefined) {
                // first key, no previous key to compare
                prevKey = current[0];
            }

            const [currentKey, , currentIsDeleted] = current;
            const [nextKey, nextVersion] = next;

            const nextIsVisibleToAllTransactions =
                nextVersion < oldestReadVersionInUse;

            const nextIsTheSame = () =>
                compareUint8Array(currentKey, nextKey) === 0;
            const prevIsDifferent = () => {
                assert(
                    prevKey !== undefined,
                    'Previous was defined at the start of the loop'
                );
                compareUint8Array(prevKey, currentKey) !== 0;
            };

            const nextOverridesCurrent =
                nextIsVisibleToAllTransactions && nextIsTheSame();
            const currentTombstoneOverridesNothing =
                currentIsDeleted && prevIsDifferent();

            if (nextOverridesCurrent || currentTombstoneOverridesNothing) {
                yield current;
            } else {
                prevKey = currentKey;
            }
        }
    }

    private async commit(
        tx: MvccTransaction,
        snapKey: MvccSnapshotKey,
        attempt: number
    ) {
        if (tx.writeSet.length === 0) return;

        const [readVersion] = snapKey;

        await this._write(
            snapKey,
            async ({log, data, version, activeTransactions: running}) => {
                const runningTimestamp = await running.get(snapKey);
                if (runningTimestamp === undefined) {
                    throw new AppError(
                        `Transaction got garbage collected before commit: ${stringifyTuple(snapKey)}`
                    );
                }

                const commited = await toStream(
                    log.query({gte: [readVersion, 0]})
                )
                    .map(({key: [version], value}) => ({
                        version,
                        key: value,
                    }))
                    .toArray();

                ensureSerializable(
                    readVersion,
                    tx.readRanges,
                    attempt + 1,
                    commited
                );

                const currentVersion = toMvccVersion(
                    (await version.get([])) ?? 0
                );
                const nextVersion = incrementMvccVersion(currentVersion);

                // update version, persistent data, and log
                await whenAll([
                    version.put([], nextVersion),
                    ...zip(tx.writeSet.keys, tx.writeSet.values).map(
                        async ([key, {value}]) => {
                            if (value === undefined) {
                                // put tombstone
                                await data.put(
                                    [key, nextVersion, true],
                                    new Uint8Array()
                                );
                            } else {
                                await data.put(
                                    [key, nextVersion, false],
                                    value
                                );
                            }
                        }
                    ),
                    ...tx.writeSet.keys.map((key, index) =>
                        log.put([nextVersion, index], key)
                    ),
                ]);
            }
        );
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }

    async _read<R>(
        mvccKey: MvccSnapshotKey | undefined,
        fn: (suite: ReadSuite) => Promise<R>
    ): Promise<R> {
        return await this.store.snapshot(async tx => {
            const suite: ReadSuite = {
                data: pipe(
                    tx,
                    isolateSnapshot(['data']),
                    withSnapshotPacker(new PersistentKeyPacker()),
                    interceptSnapshot(
                        (key, forward) => (this.lastRead = {key, forward})
                    )
                ),
                version: pipe(
                    tx,
                    isolateSnapshot(['version']),
                    withSnapshotPacker(new VersionKeyPacker()),
                    withSnapshotCodec(new MsgpackCodec<number>())
                ),
                gcScanOffset: pipe(
                    tx,
                    isolateSnapshot(['gcScanOffset']),
                    withSnapshotPacker(new NumberPacker()),
                    withSnapshotCodec(new MsgpackCodec())
                ),
                log: pipe(
                    tx,
                    isolateSnapshot(['log']),
                    withSnapshotPacker(new LogKeyPacker())
                ),
                activeTransactions: pipe(
                    tx,
                    isolateSnapshot(['active']),
                    withSnapshotPacker(new RunningTransactionKeyPacker()),
                    withSnapshotCodec(new MsgpackCodec<Timestamp>())
                ),
                rawStore: tx,
            };

            const [result] = await whenAll([
                fn(suite),
                mvccKey
                    ? this._ensureSnapshotAlive(suite, mvccKey)
                    : Promise.resolve(),
            ]);

            return result;
        });
    }

    private async _write<R>(
        mvccKey: MvccSnapshotKey | undefined,
        fn: (tx: WriteSuite) => Promise<R>
    ): Promise<R> {
        return await this.store.transact(async tx => {
            const suite: WriteSuite = {
                data: pipe(
                    tx,
                    isolate(['data']),
                    withPacker(new PersistentKeyPacker())
                ),
                log: pipe(tx, isolate(['log']), withPacker(new LogKeyPacker())),
                version: pipe(
                    tx,
                    isolate(['version']),
                    withPacker(new VersionKeyPacker()),
                    withCodec(new MsgpackCodec<number>())
                ),
                gcScanOffset: pipe(
                    tx,
                    isolate(['gcScanOffset']),
                    withPacker(new NumberPacker()),
                    withCodec(new MsgpackCodec())
                ),
                activeTransactions: pipe(
                    tx,
                    isolate(['active']),
                    withPacker(new RunningTransactionKeyPacker()),
                    withCodec(new MsgpackCodec<Timestamp>())
                ),
                rawStore: tx,
            };

            const [result] = await whenAll([
                fn(suite),
                mvccKey
                    ? this._ensureSnapshotAlive(suite, mvccKey)
                    : Promise.resolve(),
            ]);

            return result;
        });
    }

    private async getReadVersion() {
        return await this._read(undefined, async suite => {
            const version = await suite.version.get([]);
            return toMvccVersion(version ?? 0);
        });
    }
}

class VersionKeyPacker implements Packer<readonly []> {
    pack(value: readonly []): Tuple {
        assert(value.length === 0, 'Invalid version key');
        return [];
    }

    unpack(value: Tuple): readonly [] {
        assert(value.length === 0, 'Invalid version key');
        return [];
    }
}

class PersistentKeyPacker implements Packer<DataKey> {
    pack(value: DataKey): Tuple {
        return value;
    }

    unpack(value: Tuple): DataKey {
        const assertionMessage = () =>
            `Invalid persistent key: ${stringifyTuple(value)}`;

        assert(value.length === 3, assertionMessage);

        const key = value[0];
        assert(key instanceof Uint8Array, assertionMessage);

        const version = value[1];
        assert(typeof version === 'number', assertionMessage);

        const deleted = value[2];
        assert(typeof deleted === 'boolean', assertionMessage);

        return [key, version, deleted];
    }
}

class LogKeyPacker implements Packer<LogKey> {
    pack(value: LogKey): Tuple {
        return value;
    }

    unpack(value: Tuple): LogKey {
        const assertionMessage = () =>
            `Invalid log key: ${stringifyTuple(value)}`;

        assert(value.length === 2, assertionMessage);

        const version = value[0];
        assert(typeof version === 'number', assertionMessage);

        const writtenKeyIndex = value[1];
        assert(typeof writtenKeyIndex === 'number', assertionMessage);

        return [toMvccVersion(version), writtenKeyIndex];
    }
}

class RunningTransactionKeyPacker implements Packer<MvccSnapshotKey> {
    pack(value: MvccSnapshotKey): Tuple {
        return value;
    }

    unpack(value: Tuple): MvccSnapshotKey {
        const assertionMessage = () =>
            `Invalid running key: ${stringifyTuple(value)}`;

        assert(value.length === 2, assertionMessage);

        const version = value[0];
        assert(typeof version === 'number', assertionMessage);

        const transactionId = value[1];
        assert(typeof transactionId === 'string', assertionMessage);
        assert(validateUuid(transactionId), assertionMessage);

        return [toMvccVersion(version), transactionId];
    }
}
