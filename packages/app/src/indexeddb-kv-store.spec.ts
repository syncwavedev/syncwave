import 'fake-indexeddb/auto';
import {deleteDB, openDB} from 'idb';
import {whenAll} from 'syncwave';
import {beforeEach, describe, expect, it} from 'vitest';
import {IndexedDBKVStore, IndexedDBTransaction} from './indexeddb-kv-store.js';

let dbName = 'test-db';

beforeEach(() => {
    dbName = 'test-db-' + Math.random().toString().split('.')[1];
});

const key1 = new Uint8Array([1, 2, 3]);
const key2 = new Uint8Array([4, 5, 6]);
const value1 = new Uint8Array([10, 20, 30]);
const value2 = new Uint8Array([40, 50, 60]);

describe('IndexedDBKVStore', () => {
    beforeEach(async () => {
        // Clean up the database before each test
        await deleteDB(dbName);
    });

    it('should initialize a database without errors', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async () => {});
        const db = await openDB(dbName);
        expect(db.objectStoreNames.contains('index')).toBe(true);
        db.close();
    });

    it('should put and get a value', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async tx => {
            await tx.put(key1, value1);
            const retrievedValue = await tx.get(key1);
            expect(retrievedValue).toEqual(value1);
        });
    });

    it('should throw if transaction auto-commited before user tx', async () => {
        const store = new IndexedDBKVStore(dbName);
        await expect(
            store.transact(async tx => {
                await tx.put(key1, value1);
                await new Promise(setImmediate);
            })
        ).rejects.toThrowError(/transaction is already completed or aborted/i);
    });

    it('should return undefined for a non-existent key', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async tx => {
            const retrievedValue = await tx.get(key1);
            expect(retrievedValue).toBeUndefined();
        });
    });

    it('should delete a value', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async tx => {
            await tx.put(key1, value1);
            await tx.delete(key1);
            const retrievedValue = await tx.get(key1);
            expect(retrievedValue).toBeUndefined();
        });
    });

    it('should query values with a condition (gte)', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async tx => {
            await tx.put(key1, value1);
            await tx.put(key2, value2);

            const entries = [];
            for await (const entry of tx.query({gte: key1})) {
                entries.push(entry);
            }

            expect(entries).toHaveLength(2);
            expect(entries).toEqual([
                {key: key1, value: value1},
                {key: key2, value: value2},
            ]);
        });
    });

    it('should throw an error when accessing a completed transaction', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async tx => {
            await tx.put(key1, value1);
            (tx as IndexedDBTransaction).markDone();
            await expect(tx.get(key1)).rejects.toThrowError(
                'IDB request made after transaction function has resolved.'
            );
        });
    });

    it('should handle transaction aborts gracefully', async () => {
        const store = new IndexedDBKVStore(dbName);
        await expect(
            store.transact(async tx => {
                await tx.put(key1, value1);
                throw new Error('Simulated error');
            })
        ).rejects.toThrowError('Simulated error');

        const db = await openDB(dbName);
        const tx = db.transaction('index', 'readonly');
        const retrievedValue = await tx.objectStore('index').get(key1);
        expect(retrievedValue).toBeUndefined();
    });

    it('should support querying with upper and lower bounds', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async tx => {
            await tx.put(key1, value1);
            await tx.put(key2, value2);

            const entries = [];
            for await (const entry of tx.query({lt: key2})) {
                entries.push(entry);
            }

            expect(entries).toHaveLength(1);
            expect(entries[0]).toEqual({key: key1, value: value1});
        });
    });

    it('should overwrite an existing value', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async tx => {
            await tx.put(key1, value1);
            const initialRetrievedValue = await tx.get(key1);
            expect(initialRetrievedValue).toEqual(value1);

            await tx.put(key1, value2);
            const updatedRetrievedValue = await tx.get(key1);
            expect(updatedRetrievedValue).toEqual(value2);
        });
    });

    it('should handle transactions with multiple operations', async () => {
        const store = new IndexedDBKVStore(dbName);
        await store.transact(async tx => {
            await tx.put(key1, value1);
            await tx.put(key2, value2);

            const retrievedValue1 = await tx.get(key1);
            const retrievedValue2 = await tx.get(key2);

            expect(retrievedValue1).toEqual(value1);
            expect(retrievedValue2).toEqual(value2);
        });
    });

    it('should perform concurrent transactions', async () => {
        const store = new IndexedDBKVStore(dbName);

        await whenAll([
            store.transact(async tx => {
                await tx.put(key1, value1);
            }),
            store.transact(async tx => {
                await tx.put(key2, value2);
            }),
        ]);

        await store.transact(async tx => {
            const retrievedValue1 = await tx.get(key1);
            const retrievedValue2 = await tx.get(key2);

            expect(retrievedValue1).toEqual(value1);
            expect(retrievedValue2).toEqual(value2);
        });
    });
});
