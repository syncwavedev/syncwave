import {context} from '../context.js';
import type {Tuple} from '../tuple.js';
import type {
    Condition,
    Entry,
    KvStore,
    Snapshot,
    Transaction,
} from './kv-store.js';

export class SnapshotInstrumenter<K extends Tuple, V>
    implements Snapshot<K, V>
{
    keysRead = 0;
    keysReturned = 0;

    get base() {
        return this.snap;
    }

    constructor(private readonly snap: Snapshot<K, V>) {}

    async get(key: K): Promise<V | undefined> {
        this.keysRead++;
        this.keysReturned++;
        return await context().runChild({span: 'kv.get'}, async () => {
            return this.snap.get(key);
        });
    }
    async *query(condition: Condition<K>): AsyncIterable<Entry<K, V>> {
        const [, cancelCtx] = context().createChild({span: 'kv.query'});
        try {
            for await (const entry of this.snap.query(condition)) {
                this.keysRead++;
                this.keysReturned++;
                yield entry;
            }
        } finally {
            cancelCtx('kv query done');
        }
    }
}

export class TransactionInstrumenter<K extends Tuple, V>
    extends SnapshotInstrumenter<K, V>
    implements Transaction<K, V>
{
    constructor(private readonly tx: Transaction<K, V>) {
        super(tx);
    }

    async put(key: K, value: V): Promise<void> {
        return await context().runChild({span: 'kv.put'}, async () => {
            return this.tx.put(key, value);
        });
    }

    async delete(key: K): Promise<void> {
        await context().runChild({span: 'kv.delete'}, async () => {
            return this.tx.delete(key);
        });
    }
}

export class InstrumentedKvStore<K extends Tuple, V> implements KvStore<K, V> {
    constructor(private readonly store: KvStore<K, V>) {}
    async snapshot<TResult>(
        fn: (tx: Snapshot<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return await context().runChild({span: 'kv.snapshot'}, async () => {
            let attempt = 1;
            return await this.store.snapshot(async tx => {
                return context().runChild(
                    {span: 'kv.snapshot.attempt.' + attempt++},
                    async () => {
                        return await fn(new SnapshotInstrumenter(tx));
                    }
                );
            });
        });
    }
    async transact<TResult>(
        fn: (tx: Transaction<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return await context().runChild({span: 'kv.transact'}, async () => {
            let attempt = 1;
            return await this.store.transact(async tx => {
                return context().runChild(
                    {span: 'kv.transact.attempt.' + attempt++},
                    async () => {
                        return await fn(new TransactionInstrumenter(tx));
                    }
                );
            });
        });
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }
}
