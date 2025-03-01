import {NumberCodec} from '../codec.js';
import {context} from '../context.js';
import {AppError} from '../errors.js';
import {log} from '../logger.js';
import {toStream} from '../stream.js';
import type {Timestamp} from '../timestamp.js';
import {stringifyTuple, type Packer, type Tuple} from '../tuple.js';
import {
    assert,
    compareUint8Array,
    pipe,
    unimplemented,
    whenAll,
    zip,
} from '../utils.js';
import {createUuidV4, validateUuid, type Uuid} from '../uuid.js';
import type {Snapshot} from './kv-store.js';
import {
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
    MvccTransaction,
    toMvccVersion,
    type MvccVersion,
} from './mem-mvcc-store.js';
import {TupleStore} from './tuple-store.js';

// add checks that transaction is still running (see check in .commit)
export class MvccSnapshotAdapter implements Snapshot<Uint8Array, Uint8Array> {
    constructor(
        protected readonly adapter: MvccAdapter,
        protected readonly readVersion: number
    ) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        return await this.adapter._snapshot(async ({data: snapshot}) => {
            for await (const {
                key: [entryKey, version, deleted],
                value,
            } of snapshot.query({
                lte: [key, this.readVersion, true],
            })) {
                const cmpResult = compareUint8Array(entryKey, key);
                assert(cmpResult <= 0, 'Invalid key: must be lte');

                if (cmpResult !== 0) {
                    return undefined;
                }

                assert(
                    version <= this.readVersion,
                    'Invalid version: must be lte'
                );

                if (deleted) {
                    return undefined;
                }

                return value;
            }

            return undefined;
        });
    }

    async *query(condition: Condition<Uint8Array>): AsyncIterable<Uint8Entry> {
        let cond = mapCondition<Uint8Array, Condition<DataKey>>(condition, {
            gt: cond => ({gt: [cond.gt, this.readVersion, true]}),
            gte: cond => ({gte: [cond.gte, this.readVersion, false]}),
            lt: cond => ({lte: [cond.lt, this.readVersion, false]}),
            lte: cond => ({lte: [cond.lte, this.readVersion, true]}),
        });

        let lastObservedKey: Uint8Array | undefined = undefined;

        while (true) {
            const entries = await this.adapter._snapshot(
                async ({data: snapshot}) => {
                    return await toStream(snapshot.query(cond))
                        .take(100)
                        .toArray();
                }
            );

            if (entries.length === 0) break;

            const last = entries[entries.length - 1];
            cond = mapCondition<Uint8Array, Condition<DataKey>>(condition, {
                gt: () => ({gt: last.key}),
                gte: () => ({gt: last.key}),
                lt: () => ({lt: last.key}),
                lte: () => ({lt: last.key}),
            });

            for await (const {
                key: [key, version, deleted],
                value,
            } of entries) {
                if (
                    version > this.readVersion ||
                    (lastObservedKey !== undefined &&
                        compareUint8Array(key, lastObservedKey) === 0)
                ) {
                    continue;
                }

                lastObservedKey = key;
                if (!deleted) {
                    yield {key, value};
                }
            }
        }
    }
}

type DataKey = [key: Uint8Array, version: number, deleted: boolean];

interface ReadTx {
    data: Snapshot<DataKey, Uint8Array>;
    version: Snapshot<readonly [], number>;
}

type LogKey = readonly [commitVersion: MvccVersion, writeKeyIndex: number];

type RunningTransactionKey = readonly [
    version: MvccVersion,
    transactionId: Uuid,
];

type VersionKey = readonly [];

interface WriteTx {
    data: Transaction<DataKey, Uint8Array>;
    log: Transaction<LogKey, Uint8Array>;
    version: Transaction<VersionKey, number>;
    running: Transaction<RunningTransactionKey, Timestamp>;
}

export interface MvccAdapterOptions {
    readonly transactionRetryCount: number;
}

export class MvccAdapter implements KvStore<Uint8Array, Uint8Array> {
    private readonly store: KvStore<Tuple, Uint8Array>;

    constructor(
        store: KvStore<Uint8Array, Uint8Array>,
        private readonly options: MvccAdapterOptions
    ) {
        this.store = new TupleStore(store);
    }

    async snapshot<TResult>(
        fn: (tx: Snapshot<Uint8Array, Uint8Array>) => Promise<TResult>
    ): Promise<TResult> {
        const ver = await this.getReadVersion();
        const tx = new MvccSnapshotAdapter(this, ver);

        return await fn(tx);
    }

    async transact<TResult>(
        fn: (tx: Transaction<Uint8Array, Uint8Array>) => Promise<TResult>
    ): Promise<TResult> {
        for (
            let attempt = 0;
            attempt <= this.options.transactionRetryCount;
            attempt += 1
        ) {
            const readVersion = await this.getReadVersion();
            const transactionId = createUuidV4();
            const runningKey: RunningTransactionKey = [
                readVersion,
                transactionId,
            ];
            try {
                await this.recordTransactionStart(runningKey);

                const tx = new MvccTransaction(
                    new MvccSnapshotAdapter(this, readVersion)
                );

                const result = await fn(tx);

                await this.commit(tx, runningKey, attempt);

                return result;
            } catch (error) {
                if (attempt === this.options.transactionRetryCount) {
                    throw error;
                }
            } finally {
                context().detach({span: 'rw_mvcc_adapter_tx_cleanup'}, () => {
                    this.recordTransactionEnd(runningKey).catch(error => {
                        log.error(error, 'Failed to record transaction end');
                    });
                    this.gc().catch(error => {
                        log.error(error, 'Failed to run GC');
                    });
                });
            }
        }

        unimplemented();
    }

    private async recordTransactionStart(runningKey: RunningTransactionKey) {
        unimplemented();
    }

    private async recordTransactionEnd(runningKey: RunningTransactionKey) {
        unimplemented();
    }

    // todo: don't run GC on every call
    private async gc() {
        // todo
    }

    private async commit(
        tx: MvccTransaction,
        runningTransactionKey: RunningTransactionKey,
        attempt: number
    ) {
        if (tx.writeSet.length === 0) return;

        const [readVersion] = runningTransactionKey;

        await this._transact(async ({log, data, version, running}) => {
            const runningTimestamp = await running.get(runningTransactionKey);
            if (runningTimestamp === undefined) {
                throw new AppError(
                    `Transaction got garbage collected before commit: ${stringifyTuple(runningTransactionKey)}`
                );
            }

            const commited = await toStream(log.query({gte: [readVersion, 0]}))
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

            const currentVersion = toMvccVersion((await version.get([])) ?? 0);
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
                            await data.put([key, nextVersion, false], value);
                        }
                    }
                ),
                ...commited.map(({version, key}, index) =>
                    log.put([version, index], key)
                ),
            ]);
        });
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }

    async _snapshot<R>(fn: (tx: ReadTx) => Promise<R>): Promise<R> {
        return await this.store.snapshot(tx => {
            return fn({
                data: pipe(
                    tx,
                    isolateSnapshot(['data']),
                    withSnapshotPacker(new PersistentKeyPacker())
                ),
                version: pipe(
                    tx,
                    isolateSnapshot(['version']),
                    withSnapshotPacker(new VersionKeyPacker()),
                    withSnapshotCodec(new NumberCodec())
                ),
            });
        });
    }

    async _transact<R>(fn: (tx: WriteTx) => Promise<R>): Promise<R> {
        return await this.store.transact(async tx => {
            return await fn({
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
                    withCodec(new NumberCodec())
                ),
                running: pipe(
                    tx,
                    isolate(['running']),
                    withPacker(new RunningTransactionKeyPacker()),
                    withCodec(new NumberCodec<Timestamp>())
                ),
            });
        });
    }

    private async getReadVersion() {
        return toMvccVersion(
            (await this._snapshot(tx => tx.version.get([]))) ?? 0
        );
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

class RunningTransactionKeyPacker implements Packer<RunningTransactionKey> {
    pack(value: RunningTransactionKey): Tuple {
        return value;
    }

    unpack(value: Tuple): RunningTransactionKey {
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
