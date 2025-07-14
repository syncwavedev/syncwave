import type {Tuple} from '../tuple.js';
import {compareTuple} from '../tuple.js';
import {
    mapCondition,
    type Condition,
    type Entry,
    type KvStore,
    type Snapshot,
    type Transaction,
} from './kv-store.js';

export class SnapshotIsolator<TValue> implements Snapshot<Tuple, TValue> {
    keysRead = 0;
    keysReturned = 0;

    get base() {
        return this.snapshot;
    }

    constructor(
        private readonly snapshot: Snapshot<Tuple, TValue>,
        protected readonly prefix: Tuple
    ) {}

    get(key: Tuple): Promise<TValue | undefined> {
        this.keysRead += 1;
        this.keysReturned += 1;
        return this.snapshot.get([...this.prefix, ...key]);
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

        const entries = this.snapshot.query(prefixedCondition);
        for await (const {key, value} of entries) {
            this.keysRead += 1;
            if (
                compareTuple(key.slice(0, this.prefix.length), this.prefix) !==
                0
            ) {
                return;
            }

            this.keysReturned += 1;

            yield {key: key.slice(this.prefix.length), value};
        }
    }
}

export class TransactionIsolator<TValue>
    extends SnapshotIsolator<TValue>
    implements Transaction<Tuple, TValue>
{
    constructor(
        private readonly tx: Transaction<Tuple, TValue>,
        prefix: Tuple
    ) {
        super(tx, prefix);
    }

    put(key: Tuple, value: TValue): Promise<void> {
        return this.tx.put([...this.prefix, ...key], value);
    }

    delete(key: Tuple): Promise<void> {
        return this.tx.delete([...this.prefix, ...key]);
    }
}

export class KvStoreIsolator<TValue> implements KvStore<Tuple, TValue> {
    constructor(
        private readonly target: KvStore<Tuple, TValue>,
        private readonly prefix: Tuple
    ) {}

    async snapshot<TResult>(
        fn: (tx: Snapshot<Tuple, TValue>) => Promise<TResult>
    ): Promise<TResult> {
        return await this.target.snapshot(tx =>
            fn(new SnapshotIsolator(tx, this.prefix))
        );
    }

    async transact<TResult>(
        fn: (tx: Transaction<Tuple, TValue>) => Promise<TResult>
    ): Promise<TResult> {
        return await this.target.transact(tx =>
            fn(new TransactionIsolator(tx, this.prefix))
        );
    }

    close(reason: unknown): void {
        this.target.close(reason);
    }
}
