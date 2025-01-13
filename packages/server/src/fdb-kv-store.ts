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

fdb.setAPIVersion(630);

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
        const [selector, reverse] = mapCondition<Uint8Array, [selector: fdb.KeySelector<Buffer>, reverse: boolean]>(
            condition,
            {
                gt: (cond: GtCondition<Uint8Array>) => [fdb.keySelector.firstGreaterThan(Buffer.from(cond.gt)), false],
                gte: (cond: GteCondition<Uint8Array>) => [
                    fdb.keySelector.firstGreaterOrEqual(Buffer.from(cond.gte)),
                    false,
                ],
                lt: (cond: LtCondition<Uint8Array>) => [fdb.keySelector.lastLessThan(Buffer.from(cond.lt)), true],
                lte: (cond: LteCondition<Uint8Array>) => [fdb.keySelector.lastLessOrEqual(Buffer.from(cond.lte)), true],
            }
        );

        for await (const [kBuf, vBuf] of this.txn.getRange(selector, undefined, {reverse})) {
            yield {
                key: new Uint8Array(kBuf),
                value: new Uint8Array(vBuf),
            };
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
