import * as fdb from 'foundationdb';
import {
    type Condition,
    type Entry,
    type GtCondition,
    type GteCondition,
    type LtCondition,
    type LteCondition,
    mapCondition,
    toStream,
    type Uint8KvStore,
    type Uint8Transaction,
} from 'syncwave-data';

fdb.setAPIVersion(620, 620);

const MAGIC_BYTE = 174;

// todo: use context
export class FoundationDBUint8Transaction implements Uint8Transaction {
    private readonly tx: fdb.Transaction;

    constructor(tx: fdb.Transaction) {
        this.tx = tx;
    }

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        const val = await this.tx.get(Buffer.from(key));
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

export class FoundationDBUint8KvStore implements Uint8KvStore {
    private readonly db: fdb.Database;

    constructor(clusterFilePath?: string) {
        this.db = fdb.open(clusterFilePath);
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

    async close(): Promise<void> {
        this.db.close();
    }
}
