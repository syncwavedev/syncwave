import * as fdb from 'foundationdb';
import {
    Condition,
    Entry,
    GtCondition,
    GteCondition,
    LtCondition,
    LteCondition,
    Uint8KVStore,
    Uint8Transaction,
    mapCondition,
} from 'ground-data';

fdb.setAPIVersion(620, 620);

export class FoundationDBUint8Transaction implements Uint8Transaction {
    private readonly txn: fdb.Transaction;

    constructor(txn: fdb.Transaction) {
        this.txn = txn;
    }

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        const val = await this.txn.get(Buffer.from(key));
        if (val === undefined) {
            return undefined;
        }
        return new Uint8Array(val);
    }

    async *query(condition: Condition<Uint8Array>): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const [key, reverse, open] = mapCondition<Uint8Array, [Uint8Array, boolean, boolean]>(condition, {
            gt: (cond: GtCondition<Uint8Array>) => [cond.gt, false, true],
            gte: (cond: GteCondition<Uint8Array>) => [cond.gte, false, false],
            lt: (cond: LtCondition<Uint8Array>) => [cond.lt, true, true],
            lte: (cond: LteCondition<Uint8Array>) => [cond.lte, true, false],
        });

        let skippedFirst = false;
        for await (const [kBuf, vBuf] of this.txn.getRange(Buffer.from(key), undefined, {reverse})) {
            if (!open || skippedFirst || !kBuf.equals(key)) {
                yield {
                    key: new Uint8Array(kBuf),
                    value: new Uint8Array(vBuf),
                };
            } else {
                skippedFirst = true;
            }
        }
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        this.txn.set(Buffer.from(key), Buffer.from(value));
    }

    async delete(key: Uint8Array): Promise<void> {
        this.txn.clear(Buffer.from(key));
    }
}

export class FoundationDBUint8KVStore implements Uint8KVStore {
    private readonly db: fdb.Database;

    constructor(clusterFilePath?: string) {
        this.db = fdb.open(clusterFilePath);
    }

    async transaction<TResult>(fn: (txn: Uint8Transaction) => Promise<TResult>): Promise<TResult> {
        return this.db.doTransaction(async nativeTxn => {
            const wrappedTxn = new FoundationDBUint8Transaction(nativeTxn);
            return fn(wrappedTxn);
        });
    }
}
