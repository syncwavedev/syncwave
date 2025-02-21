import {decodeTuple, encodeTuple, type Tuple} from '../tuple.js';
import {
    mapCondition,
    type Condition,
    type KVStore,
    type Transaction,
} from './kv-store.js';

export class TupleTransaction<TKey extends Tuple, TValue>
    implements Transaction<TKey, TValue>
{
    constructor(private readonly target: Transaction<Uint8Array, TValue>) {}

    get(key: TKey): Promise<TValue | undefined> {
        return this.target.get(encodeTuple(key));
    }

    async *query(
        condition: Condition<TKey>
    ): AsyncIterable<{key: TKey; value: TValue}> {
        for await (const {key, value} of this.target.query(
            mapCondition<TKey, Condition<Uint8Array>>(condition, {
                gt: cond => ({gt: encodeTuple(cond.gt)}),
                gte: cond => ({gte: encodeTuple(cond.gte)}),
                lt: cond => ({lt: encodeTuple(cond.lt)}),
                lte: cond => ({lte: encodeTuple(cond.lte)}),
            })
        )) {
            yield {key: decodeTuple(key) as TKey, value};
        }
    }

    put(key: TKey, value: TValue): Promise<void> {
        return this.target.put(encodeTuple(key), value);
    }

    delete(key: TKey): Promise<void> {
        return this.target.delete(encodeTuple(key));
    }
}

export class TupleStore<TKey extends Tuple, TValue>
    implements KVStore<TKey, TValue>
{
    constructor(private readonly store: KVStore<Uint8Array, TValue>) {}

    transact<TResult>(
        fn: (tx: TupleTransaction<TKey, TValue>) => Promise<TResult>
    ): Promise<TResult> {
        return this.store.transact(async tx => {
            const tupleTx = new TupleTransaction<TKey, TValue>(tx);
            return await fn(tupleTx);
        });
    }
    close(): void {
        this.store.close();
    }
}
