import {AppError} from '../errors.js';
import {Condition, Entry, KVStore, Transaction} from './kv-store.js';

export class TransactionCache<K, V> implements Transaction<K, V> {
    get(key: K): Promise<V | undefined> {
        throw new AppError('Method not implemented.');
    }
    query(condition: Condition<K>): AsyncIterable<Entry<K, V>> {
        throw new AppError('Method not implemented.');
    }
    put(key: K, value: V): Promise<void> {
        throw new AppError('Method not implemented.');
    }
    delete(key: K): Promise<void> {
        throw new AppError('Method not implemented.');
    }
}

export class KVStoreCache<K, V> implements KVStore<K, V> {
    transact<TResult>(
        fn: (tx: Transaction<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        throw new AppError('Method not implemented.');
    }
    close(): void {
        throw new AppError('Method not implemented.');
    }
}
