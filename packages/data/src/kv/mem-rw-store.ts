import {RwLock} from '../rw-lock.js';
import type {KvStore, Snapshot, Transaction} from './kv-store.js';

export class MemRwStore<K, V> implements KvStore<K, V> {
    private readonly lock = new RwLock();

    constructor(private readonly store: KvStore<K, V>) {}

    snapshot<TResult>(
        fn: (tx: Snapshot<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return this.lock.runRead(async () => await this.store.snapshot(fn));
    }

    transact<TResult>(
        fn: (tx: Transaction<K, V>) => Promise<TResult>
    ): Promise<TResult> {
        return this.lock.runWrite(async () => await this.store.transact(fn));
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }
}
