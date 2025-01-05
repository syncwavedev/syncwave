import {beforeEach, describe, expect, it} from 'vitest';
import {InMemoryKeyValueStore} from '../kv/in-memory/in-memory-key-value-store';
import {OptimisticLock} from './optimistic-lock';

const decodeToString = buf => new TextDecoder().decode(buf);
const encodeFromString = str => new TextEncoder().encode(str);

// Test suite for OptimisticLock
describe('OptimisticLock', () => {
    let kvStore: InMemoryKeyValueStore;

    beforeEach(() => {
        kvStore = new InMemoryKeyValueStore();
    });

    it('should create a lock with an empty key if no key is provided', async () => {
        await kvStore.transaction(async txn => {
            const lock = new OptimisticLock(txn);
            await lock.lock();

            const emptyKey = new Uint8Array();
            const value = await txn.get(emptyKey);
            expect(value).toBeDefined();
        });
    });

    it('should create a lock with a string key', async () => {
        const key = 'test-key';

        await kvStore.transaction(async txn => {
            const lock = new OptimisticLock(txn);
            await lock.lock(key);

            const encodedKey = encodeFromString(key);
            const value = await txn.get(encodedKey);
            expect(value).toBeDefined();
        });
    });

    it('should create a lock with a Uint8Array key', async () => {
        const key = encodeFromString('test-key');

        await kvStore.transaction(async txn => {
            const lock = new OptimisticLock(txn);
            await lock.lock(key);

            const value = await txn.get(key);
            expect(value).toBeDefined();
        });
    });

    it('should overwrite the existing lock value for the same key', async () => {
        const key = 'test-key';

        await kvStore.transaction(async txn => {
            const lock = new OptimisticLock(txn);
            await lock.lock(key);

            const encodedKey = encodeFromString(key);
            const firstValue = await txn.get(encodedKey);

            await lock.lock(key);
            const secondValue = await txn.get(encodedKey);

            expect(secondValue).not.toEqual(firstValue);
        });
    });

    it('should allow multiple keys to be locked independently', async () => {
        const key1 = 'key1';
        const key2 = 'key2';

        await kvStore.transaction(async txn => {
            const lock = new OptimisticLock(txn);
            await lock.lock(key1);
            await lock.lock(key2);

            const encodedKey1 = encodeFromString(key1);
            const encodedKey2 = encodeFromString(key2);

            const value1 = await txn.get(encodedKey1);
            const value2 = await txn.get(encodedKey2);

            expect(value1).toBeDefined();
            expect(value2).toBeDefined();
            expect(value1).not.toEqual(value2);
        });
    });

    it('should handle locking an empty Uint8Array key', async () => {
        const key = new Uint8Array();

        await kvStore.transaction(async txn => {
            const lock = new OptimisticLock(txn);
            await lock.lock(key);

            const value = await txn.get(key);
            expect(value).toBeDefined();
        });
    });

    it('should handle concurrent locks with different transactions', async () => {
        const key1 = 'key1';
        const key2 = 'key2';

        await Promise.all([
            kvStore.transaction(async txn => {
                const lock = new OptimisticLock(txn);
                await lock.lock(key1);
                const encodedKey1 = encodeFromString(key1);
                const value1 = await txn.get(encodedKey1);
                expect(value1).toBeDefined();
            }),
            kvStore.transaction(async txn => {
                const lock = new OptimisticLock(txn);
                await lock.lock(key2);
                const encodedKey2 = encodeFromString(key2);
                const value2 = await txn.get(encodedKey2);
                expect(value2).toBeDefined();
            }),
        ]);
    });
});
