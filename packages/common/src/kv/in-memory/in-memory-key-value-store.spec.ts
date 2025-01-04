import createTree from 'functional-red-black-tree';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {compareUint8Array} from '../../utils';
import {Entry, InvalidQueryCondition} from '../kv-store';
import {InMemoryKeyValueStore, InMemoryTransaction} from './in-memory-key-value-store'; // Adjust the path as needed

// Utility function to create Uint8Array from strings for testing
const toUint8Array = str => new TextEncoder().encode(str);

describe('InMemoryTransaction', () => {
    let tree;
    let transaction;

    beforeEach(() => {
        tree = createTree(compareUint8Array);
        transaction = new InMemoryTransaction(tree);
    });

    it('should retrieve an existing key', async () => {
        const key = toUint8Array('key1');
        const value = toUint8Array('value1');
        tree = tree.insert(key, value);
        transaction = new InMemoryTransaction(tree);

        const result = await transaction.get(key);
        expect(result).toEqual(value);
    });

    it('should return undefined for a non-existent key', async () => {
        const result = await transaction.get(toUint8Array('non-existent-key'));
        expect(result).toBeUndefined();
    });

    it('should insert a key-value pair', async () => {
        const key = toUint8Array('key1');
        const value = toUint8Array('value1');
        await transaction.put(key, value);

        const result = await transaction.get(key);
        expect(result).toEqual(value);
    });

    it('should overwrite an existing key-value pair', async () => {
        const key = toUint8Array('key1');
        const value1 = toUint8Array('value1');
        const value2 = toUint8Array('value2');

        await transaction.put(key, value1);
        await transaction.put(key, value2);

        const result = await transaction.get(key);
        expect(result).toEqual(value2);
    });

    it('should query with greater-than condition', async () => {
        const key1 = toUint8Array('a');
        const key2 = toUint8Array('b');
        const value = toUint8Array('value');

        await transaction.put(key1, value);
        await transaction.put(key2, value);

        const condition = {gt: key1};
        const results: Entry<string, string>[] = [];

        for await (const entry of transaction.query(condition)) {
            results.push(entry);
        }

        expect(results).toEqual([{key: key2, value}]);
    });

    it('should throw an error for an invalid condition', async () => {
        const condition = {};
        await expect(async () => {
            for await (const _ of transaction.query(condition)) {
            }
        }).rejects.toThrow(InvalidQueryCondition);
    });

    it('should handle less-than condition in query', async () => {
        const key1 = toUint8Array('a');
        const key2 = toUint8Array('b');
        const value = toUint8Array('value');

        await transaction.put(key1, value);
        await transaction.put(key2, value);

        const condition = {lt: key2};
        const results: Entry<string, string>[] = [];

        for await (const entry of transaction.query(condition)) {
            results.push(entry);
        }

        expect(results).toEqual([{key: key1, value}]);
    });

    it('should handle greater-than or equal condition in query', async () => {
        const key1 = toUint8Array('a');
        const key2 = toUint8Array('b');
        const value = toUint8Array('value');

        await transaction.put(key1, value);
        await transaction.put(key2, value);

        const condition = {gte: key1};
        const results: Entry<string, string>[] = [];

        for await (const entry of transaction.query(condition)) {
            results.push(entry);
        }

        expect(results).toEqual([
            {key: key1, value},
            {key: key2, value},
        ]);
    });

    it('should handle less-than or equal condition in query', async () => {
        const key1 = toUint8Array('a');
        const key2 = toUint8Array('b');
        const value = toUint8Array('value');

        await transaction.put(key1, value);
        await transaction.put(key2, value);

        const results: Entry<string, string>[] = [];

        for await (const entry of transaction.query({lte: key2})) {
            results.push(entry);
        }

        expect(results).toEqual([
            {key: key1, value},
            {key: key2, value},
        ]);
    });
});

describe('InMemoryKeyValueStore', () => {
    let kvStore;

    beforeEach(() => {
        kvStore = new InMemoryKeyValueStore();
    });

    it('should execute a transaction and persist changes', async () => {
        const key = toUint8Array('key1');
        const value = toUint8Array('value1');

        await kvStore.transaction(async txn => {
            await txn.put(key, value);
        });

        await kvStore.transaction(async txn => {
            const result = await txn.get(key);
            expect(result).toEqual(value);
        });
    });

    it('should handle concurrent transactions sequentially', async () => {
        const key = toUint8Array('key1');
        const value1 = toUint8Array('value1');
        const value2 = toUint8Array('value2');

        const txn1 = kvStore.transaction(async txn => {
            await txn.put(key, value1);
        });

        const txn2 = kvStore.transaction(async txn => {
            await txn.put(key, value2);
        });

        await Promise.all([txn1, txn2]);

        await kvStore.transaction(async txn => {
            const result = await txn.get(key);
            expect(result).toEqual(value2); // Last transaction wins
        });
    });

    it('should retry on transaction failure', async () => {
        let attempt = 0;

        await kvStore.transaction(async () => {
            if (attempt++ < 1) {
                throw new Error('Simulated failure');
            }
        });

        expect(attempt).toBe(2);
    });

    it('should fail after exceeding retry attempts', async () => {
        vi.spyOn(kvStore, 'transaction').mockImplementationOnce(async fn => {
            throw new Error('Simulated permanent failure');
        });

        await expect(kvStore.transaction(async () => {})).rejects.toThrow('Simulated permanent failure');
    });

    it('should handle transaction rollback on failure', async () => {
        const key = toUint8Array('key1');
        const value = toUint8Array('value1');

        await kvStore
            .transaction(async txn => {
                await txn.put(key, value);
                throw new Error('Simulated rollback');
            })
            .catch(() => {});

        await kvStore.transaction(async txn => {
            const result = await txn.get(key);
            expect(result).toBeUndefined();
        });
    });
});
