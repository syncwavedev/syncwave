import type {
    MvccStore,
    ReadTransaction,
    SingleWriterStore,
    Transaction,
} from './kv-store.js';
import {RwLock} from './rw-lock.js';

export class MemSingleWriterStore<K, V> implements SingleWriterStore<K, V> {
    private readonly lock = new RwLock();

    constructor(private readonly store: MvccStore<K, V>) {}

    transactRead<TResult>(
        fn: (tx: ReadTransaction<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return this.lock.runRead(async () => await this.store.transact(fn));
    }
    transactWrite<TResult>(
        fn: (tx: Transaction<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return this.lock.runWrite(async () => await this.store.transact(fn));
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }
}
