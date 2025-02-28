import type {Tuple} from '../tuple.js';
import {compareTuple} from '../tuple.js';
import {
    mapCondition,
    type Condition,
    type Entry,
    type MvccStore,
    type Transaction,
} from './kv-store.js';

export class IsolatedTransaction<TValue> implements Transaction<Tuple, TValue> {
    constructor(
        private readonly target: Transaction<Tuple, TValue>,
        private readonly prefix: Tuple
    ) {}

    get(key: Tuple): Promise<TValue | undefined> {
        return this.target.get([...this.prefix, ...key]);
    }

    async *query(
        condition: Condition<Tuple>
    ): AsyncIterable<Entry<Tuple, TValue>> {
        const prefixedCondition = mapCondition<Tuple, Condition<Tuple>>(
            condition,
            {
                gt: cond => ({gt: [...this.prefix, ...cond.gt]}),
                gte: cond => ({gte: [...this.prefix, ...cond.gte]}),
                lt: cond => ({lt: [...this.prefix, ...cond.lt]}),
                lte: cond => ({lte: [...this.prefix, ...cond.lte]}),
            }
        );

        const entries = this.target.query(prefixedCondition);
        for await (const {key, value} of entries) {
            if (
                compareTuple(key.slice(0, this.prefix.length), this.prefix) !==
                0
            ) {
                return;
            }

            yield {key: key.slice(this.prefix.length), value};
        }
    }

    put(key: Tuple, value: TValue): Promise<void> {
        return this.target.put([...this.prefix, ...key], value);
    }

    delete(key: Tuple): Promise<void> {
        return this.target.delete([...this.prefix, ...key]);
    }
}

export class IsolatedKVStore<TValue> implements MvccStore<Tuple, TValue> {
    constructor(
        private readonly target: MvccStore<Tuple, TValue>,
        private readonly prefix: Tuple
    ) {}

    async transact<TResult>(
        fn: (tx: Transaction<Tuple, TValue>) => Promise<TResult>
    ): Promise<TResult> {
        return await this.target.transact(tx =>
            fn(new IsolatedTransaction(tx, this.prefix))
        );
    }

    close(reason: unknown): void {
        this.target.close(reason);
    }
}
