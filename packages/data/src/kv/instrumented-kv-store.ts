import {context} from '../context.js';
import type {Condition, Entry, KVStore, Transaction} from './kv-store.js';

export class InstrumentedTransaction<K, V> implements Transaction<K, V> {
    constructor(private readonly tx: Transaction<K, V>) {}

    async get(key: K): Promise<V | undefined> {
        return await context().runChild({span: 'kv.get'}, async () => {
            return this.tx.get(key);
        });
    }
    async *query(condition: Condition<K>): AsyncIterable<Entry<K, V>> {
        const [, cancelCtx] = context().createChild({span: 'kv.query'});
        try {
            for await (const entry of this.tx.query(condition)) {
                yield entry;
            }
        } finally {
            cancelCtx('kv query done');
        }
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

export class InstrumentedKvStore<K, V> implements KVStore<K, V> {
    constructor(private readonly store: KVStore<K, V>) {}
    async transact<TResult>(
        fn: (tx: Transaction<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return await context().runChild({span: 'kv.transact'}, async () => {
            let attempt = 1;
            return await this.store.transact(async tx => {
                return context().runChild(
                    {span: 'kv.transact.attempt.' + attempt++},
                    async () => {
                        return await fn(new InstrumentedTransaction(tx));
                    }
                );
            });
        });
    }
    close(): void {
        this.store.close();
    }
}
