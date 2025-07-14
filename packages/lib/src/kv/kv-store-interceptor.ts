import type {Tuple} from '../tuple.js';
import {assert} from '../utils.js';
import type {
    Condition,
    Entry,
    KvStore,
    Snapshot,
    Transaction,
} from './kv-store.js';

export class SnapshotInterceptor<K, V> implements Snapshot<K, V> {
    keysRead = 0;
    keysReturned = 0;

    get base() {
        return this.snap;
    }

    constructor(
        private readonly snap: Snapshot<K, V>,
        private readonly onRead: (key: K, forward: boolean) => void
    ) {}

    async get(key: K): Promise<V | undefined> {
        this.keysRead++;
        this.keysReturned++;
        this.onRead(key, true);
        return this.snap.get(key);
    }
    async *query(condition: Condition<K>): AsyncIterable<Entry<K, V>> {
        const key =
            condition.gt || condition.gte || condition.lt || condition.lte;
        assert(!!key, 'Condition must have at least one of gt, gte, lt, lte');
        this.onRead(
            key,
            condition.gt !== undefined || condition.gte !== undefined
        );
        for await (const entry of this.snap.query(condition)) {
            this.keysRead++;
            this.keysReturned++;
            yield entry;
        }
    }
}

export class TransactionInterceptor<K, V>
    extends SnapshotInterceptor<K, V>
    implements Transaction<K, V>
{
    constructor(
        private readonly tx: Transaction<K, V>,
        onRead: (key: K, forward: boolean) => void
    ) {
        super(tx, onRead);
    }

    async put(key: K, value: V): Promise<void> {
        return this.tx.put(key, value);
    }

    async delete(key: K): Promise<void> {
        return this.tx.delete(key);
    }
}

export class InstrumentedKvStore<K extends Tuple, V> implements KvStore<K, V> {
    constructor(
        private readonly store: KvStore<K, V>,
        private readonly onRead: (key: K, forward: boolean) => void
    ) {}
    async snapshot<TResult>(
        fn: (tx: Snapshot<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return await this.store.snapshot(async tx => {
            return await fn(new SnapshotInterceptor(tx, this.onRead));
        });
    }
    async transact<TResult>(
        fn: (tx: Transaction<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return await this.store.transact(async tx => {
            return await fn(new TransactionInterceptor(tx, this.onRead));
        });
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }
}
