import {beforeEach, describe, expect, it} from 'vitest';
import type {Tuple} from '../tuple.js';
import {whenAll} from '../utils.js';
import type {AppStore} from './kv-store.js';
import {MemMvccStore} from './mem-mvcc-store.js';
import {OptimisticLock} from './optimistic-lock.js';
import {TupleStore} from './tuple-store.js';

describe('OptimisticLock', () => {
    let kvStore: AppStore;

    beforeEach(() => {
        kvStore = new TupleStore(new MemMvccStore());
    });

    it('should create a lock with an empty key if no key is provided', async () => {
        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock();

            const emptyKey: Tuple = [];
            const value = await tx.get(emptyKey);
            expect(value).toBeDefined();
        });
    });

    it('should create a lock with a string key', async () => {
        const key = ['test-key'];

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key);

            const value = await tx.get(key);
            expect(value).toBeDefined();
        });
    });

    it('should create a lock with a Uint8Array key', async () => {
        const key = ['test-key'];

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key);

            const value = await tx.get(key);
            expect(value).toBeDefined();
        });
    });

    it('should overwrite the existing lock value for the same key', async () => {
        const key = ['test-key'];

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key);

            const firstValue = await tx.get(key);

            await lock.lock(key);
            const secondValue = await tx.get(key);

            expect(secondValue).not.toEqual(firstValue);
        });
    });

    it('should allow multiple keys to be locked independently', async () => {
        const key1 = ['key1'];
        const key2 = ['key2'];

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key1);
            await lock.lock(key2);

            const value1 = await tx.get(key1);
            const value2 = await tx.get(key2);

            expect(value1).toBeDefined();
            expect(value2).toBeDefined();
            expect(value1).not.toEqual(value2);
        });
    });

    it('should handle locking an empty Uint8Array key', async () => {
        const key: Tuple = [];

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key);

            const value = await tx.get(key);
            expect(value).toBeDefined();
        });
    });

    it('should handle concurrent locks with different transactions', async () => {
        const key1 = ['key1'];
        const key2 = ['key2'];

        await whenAll([
            kvStore.transact(async tx => {
                const lock = new OptimisticLock(tx);
                await lock.lock(key1);
                const value1 = await tx.get(key1);
                expect(value1).toBeDefined();
            }),
            kvStore.transact(async tx => {
                const lock = new OptimisticLock(tx);
                await lock.lock(key2);
                const value2 = await tx.get(key2);
                expect(value2).toBeDefined();
            }),
        ]);
    });
});
