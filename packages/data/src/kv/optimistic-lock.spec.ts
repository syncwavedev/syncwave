import {beforeEach, describe, expect, it} from 'vitest';
import {encodeString} from '../codec.js';
import {whenAll} from '../utils.js';
import {MemKVStore} from './mem-kv-store.js';
import {OptimisticLock} from './optimistic-lock.js';

describe('OptimisticLock', () => {
    let kvStore: MemKVStore;

    beforeEach(() => {
        kvStore = new MemKVStore();
    });

    it('should create a lock with an empty key if no key is provided', async () => {
        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock();

            const emptyKey = new Uint8Array();
            const value = await tx.get(emptyKey);
            expect(value).toBeDefined();
        });
    });

    it('should create a lock with a string key', async () => {
        const key = 'test-key';

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key);

            const encodedKey = encodeString(key);
            const value = await tx.get(encodedKey);
            expect(value).toBeDefined();
        });
    });

    it('should create a lock with a Uint8Array key', async () => {
        const key = encodeString('test-key');

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key);

            const value = await tx.get(key);
            expect(value).toBeDefined();
        });
    });

    it('should overwrite the existing lock value for the same key', async () => {
        const key = 'test-key';

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key);

            const encodedKey = encodeString(key);
            const firstValue = await tx.get(encodedKey);

            await lock.lock(key);
            const secondValue = await tx.get(encodedKey);

            expect(secondValue).not.toEqual(firstValue);
        });
    });

    it('should allow multiple keys to be locked independently', async () => {
        const key1 = 'key1';
        const key2 = 'key2';

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key1);
            await lock.lock(key2);

            const encodedKey1 = encodeString(key1);
            const encodedKey2 = encodeString(key2);

            const value1 = await tx.get(encodedKey1);
            const value2 = await tx.get(encodedKey2);

            expect(value1).toBeDefined();
            expect(value2).toBeDefined();
            expect(value1).not.toEqual(value2);
        });
    });

    it('should handle locking an empty Uint8Array key', async () => {
        const key = new Uint8Array();

        await kvStore.transact(async tx => {
            const lock = new OptimisticLock(tx);
            await lock.lock(key);

            const value = await tx.get(key);
            expect(value).toBeDefined();
        });
    });

    it('should handle concurrent locks with different transactions', async () => {
        const key1 = 'key1';
        const key2 = 'key2';

        await whenAll([
            kvStore.transact(async tx => {
                const lock = new OptimisticLock(tx);
                await lock.lock(key1);
                const encodedKey1 = encodeString(key1);
                const value1 = await tx.get(encodedKey1);
                expect(value1).toBeDefined();
            }),
            kvStore.transact(async tx => {
                const lock = new OptimisticLock(tx);
                await lock.lock(key2);
                const encodedKey2 = encodeString(key2);
                const value2 = await tx.get(encodedKey2);
                expect(value2).toBeDefined();
            }),
        ]);
    });
});
