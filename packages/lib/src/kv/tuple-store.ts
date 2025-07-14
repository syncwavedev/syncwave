import {decodeTuple, encodeTuple, type Tuple} from '../tuple.js';
import {
    mapCondition,
    type Condition,
    type KvStore,
    type Snapshot,
    type Transaction,
} from './kv-store.js';

export class TupleSnapshot<TKey extends Tuple, TValue>
    implements Snapshot<TKey, TValue>
{
    keysRead = 0;
    keysReturned = 0;

    get base() {
        return this.snap;
    }

    constructor(private readonly snap: Snapshot<Uint8Array, TValue>) {}

    get(key: TKey): Promise<TValue | undefined> {
        this.keysRead += 1;
        this.keysReturned += 1;
        return this.snap.get(encodeTuple(key));
    }

    async *query(
        condition: Condition<TKey>
    ): AsyncIterable<{key: TKey; value: TValue}> {
        for await (const {key, value} of this.snap.query(
            mapCondition<TKey, Condition<Uint8Array>>(condition, {
                gt: cond => ({gt: encodeTuple(cond.gt)}),
                gte: cond => ({gte: encodeTuple(cond.gte)}),
                lt: cond => ({lt: encodeTuple(cond.lt)}),
                lte: cond => ({lte: encodeTuple(cond.lte)}),
            })
        )) {
            this.keysRead += 1;
            this.keysReturned += 1;
            yield {key: decodeTuple(key) as TKey, value};
        }
    }
}

export class TupleTransaction<K extends Tuple, V>
    extends TupleSnapshot<K, V>
    implements Transaction<K, V>
{
    constructor(private readonly tx: Transaction<Uint8Array, V>) {
        super(tx);
    }

    put(key: K, value: V): Promise<void> {
        return this.tx.put(encodeTuple(key), value);
    }

    delete(key: K): Promise<void> {
        return this.tx.delete(encodeTuple(key));
    }
}

export class TupleStore<TKey extends Tuple, TValue>
    implements KvStore<TKey, TValue>
{
    constructor(private readonly store: KvStore<Uint8Array, TValue>) {}

    snapshot<TResult>(
        fn: (tx: TupleSnapshot<TKey, TValue>) => Promise<TResult>
    ): Promise<TResult> {
        return this.store.snapshot(async tx => {
            const tupleTx = new TupleSnapshot<TKey, TValue>(tx);
            return await fn(tupleTx);
        });
    }

    transact<TResult>(
        fn: (tx: TupleTransaction<TKey, TValue>) => Promise<TResult>
    ): Promise<TResult> {
        return this.store.transact(async tx => {
            const tupleTx = new TupleTransaction<TKey, TValue>(tx);
            return await fn(tupleTx);
        });
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }
}
