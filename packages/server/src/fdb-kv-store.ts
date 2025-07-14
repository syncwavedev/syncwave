import * as fdb from 'foundationdb';
import type {Hub} from 'syncwave';
import {
    type Condition,
    createUuidV4,
    Cursor,
    encodeTuple,
    type Entry,
    type GtCondition,
    type GteCondition,
    type LtCondition,
    type LteCondition,
    mapCondition,
    toCursor,
    toStream,
    type Uint8KvStore,
    type Uint8Transaction,
} from 'syncwave';

fdb.setAPIVersion(620, 620);

// todo: use context
export class FoundationDBUint8Transaction implements Uint8Transaction {
    private readonly tx: fdb.Transaction;
    keysRead = 0;
    keysReturned = 0;

    get base() {
        return undefined;
    }

    constructor(tx: fdb.Transaction) {
        this.tx = tx;
    }

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        const val = await this.tx.get(Buffer.from(key));
        this.keysRead += 1;
        this.keysReturned += 1;
        if (val === undefined) {
            return undefined;
        }
        return new Uint8Array(val);
    }

    async *query(
        condition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const bigKey = Buffer.from([255]);
        const smallKey = Buffer.from(new Uint8Array([]));
        const [start, end, reverse] = mapCondition<
            Uint8Array,
            [fdb.KeySelector<Buffer>, fdb.KeySelector<Buffer>, boolean]
        >(condition, {
            gt: (cond: GtCondition<Uint8Array>) => [
                fdb.keySelector.firstGreaterThan(Buffer.from(cond.gt)),
                fdb.keySelector.firstGreaterOrEqual(bigKey),
                false,
            ],
            gte: (cond: GteCondition<Uint8Array>) => [
                fdb.keySelector.firstGreaterOrEqual(Buffer.from(cond.gte)),
                fdb.keySelector.firstGreaterOrEqual(bigKey),
                false,
            ],
            lt: (cond: LtCondition<Uint8Array>) => [
                fdb.keySelector.firstGreaterOrEqual(smallKey),
                fdb.keySelector.firstGreaterOrEqual(Buffer.from(cond.lt)),
                true,
            ],
            lte: (cond: LteCondition<Uint8Array>) => [
                fdb.keySelector.firstGreaterOrEqual(smallKey),
                fdb.keySelector.firstGreaterThan(Buffer.from(cond.lte)),
                true,
            ],
        });

        for await (const [kBuf, vBuf] of toStream(
            this.tx.getRange(start, end, {reverse})
        )) {
            this.keysRead += 1;
            this.keysReturned += 1;
            yield {
                key: new Uint8Array(kBuf),
                value: new Uint8Array(vBuf),
            };
        }
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        this.tx.set(Buffer.from(key), Buffer.from(value));
    }

    async delete(key: Uint8Array): Promise<void> {
        this.tx.clear(Buffer.from(key));
    }
}

export interface FoundationDBUint8KvStoreOptions {
    clusterFilePath: string;
    topicPrefix: string;
}

export class FoundationDBUint8KvStore implements Uint8KvStore, Hub {
    private readonly db: fdb.Database;

    constructor(private readonly options: FoundationDBUint8KvStoreOptions) {
        this.db = fdb.open(options.clusterFilePath);
    }

    async emit(topic: string): Promise<void> {
        await this.db.doTn(async tx => {
            tx.set(this.toTopicKey(topic), Buffer.from(createUuidV4()));
        });
    }

    async subscribe(topic: string): Promise<Cursor<void>> {
        const key = this.toTopicKey(topic);
        let watch = await this.db.doTn(async tn => tn.watch(key));

        const db = this.db;
        return toCursor({
            async *[Symbol.asyncIterator]() {
                try {
                    while (true) {
                        const changed = await watch.promise;
                        watch = await db.doTn(async tn => tn.watch(key));
                        if (changed) {
                            yield undefined;
                        }
                    }
                } finally {
                    watch.cancel();
                }
            },
        });
    }

    async snapshot<TResult>(
        fn: (tx: Uint8Transaction) => Promise<TResult>
    ): Promise<TResult> {
        return this.db.doTransaction(async nativeTxn => {
            return fn(new FoundationDBUint8Transaction(nativeTxn));
        });
    }

    async transact<TResult>(
        fn: (tx: Uint8Transaction) => Promise<TResult>
    ): Promise<TResult> {
        return this.db.doTransaction(async nativeTxn => {
            return fn(new FoundationDBUint8Transaction(nativeTxn));
        });
    }

    close(): void {
        this.db.close();
    }

    private toTopicKey(topic: string) {
        return Buffer.from(encodeTuple([this.options.topicPrefix, topic]));
    }
}
