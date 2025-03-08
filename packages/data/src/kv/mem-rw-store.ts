import {RwLock} from '../rw-lock.js';
import type {
    Uint8KvStore,
    Uint8Snapshot,
    Uint8Transaction,
} from './kv-store.js';
import {MemMvccStore} from './mem-mvcc-store.js';

export class MemRwStore implements Uint8KvStore {
    private readonly lock = new RwLock();
    private readonly store: Uint8KvStore = new MemMvccStore();

    snapshot<TResult>(
        fn: (tx: Uint8Snapshot) => Promise<TResult>
    ): Promise<TResult> {
        return this.lock.runRead(async () => await this.store.snapshot(fn));
    }

    transact<TResult>(
        fn: (tx: Uint8Transaction) => Promise<TResult>
    ): Promise<TResult> {
        return this.lock.runWrite(async () => await this.store.transact(fn));
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }
}
