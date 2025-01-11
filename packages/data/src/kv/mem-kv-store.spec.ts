import createTree from 'functional-red-black-tree';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {StringCodec} from '../codec';
import {compareUint8Array, wait} from '../utils';
import {Entry, InvalidQueryCondition} from './kv-store';
import {MemKVStore, MemLocker, MemTransaction} from './mem-kv-store'; // Adjust the path as needed

const stringCodec = new StringCodec();
// Utility function to create Uint8Array from strings for testing
const toUint8Array = (str: string) => stringCodec.encode(str);

describe('MemTransaction', () => {
    let tree;
    let transaction;

    beforeEach(() => {
        tree = createTree(compareUint8Array);
        transaction = new MemTransaction(tree);
    });

    it('should retrieve an existing key', async () => {
        const key = toUint8Array('key1');
        const value = toUint8Array('value1');
        tree = tree.insert(key, value);
        transaction = new MemTransaction(tree);

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

        for await (const entry of transaction.query({lte: toUint8Array('d')})) {
            results.push(entry);
        }

        expect(results).toEqual([
            {key: key2, value},
            {key: key1, value},
        ]);
    });
});

describe('MemKVStore', () => {
    let kvStore;

    beforeEach(() => {
        kvStore = new MemKVStore();
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

describe('MemLocker', () => {
    let locker: MemLocker<string>;

    beforeEach(() => {
        locker = new MemLocker<string>();
    });

    it('executes a single lock correctly', async () => {
        const fn = vi.fn(async () => {
            await wait(50);
            return 'result';
        });

        const result = await locker.lock('key1', fn);

        expect(fn).toHaveBeenCalledTimes(1);
        expect(result).toBe('result');
    });

    it('executes multiple locks for the same key sequentially', async () => {
        const executionOrder: number[] = [];

        const fn1 = vi.fn(async () => {
            executionOrder.push(1);
            await wait(100);
            executionOrder.push(2);
            return 'first';
        });

        const fn2 = vi.fn(async () => {
            executionOrder.push(3);
            await wait(50);
            executionOrder.push(4);
            return 'second';
        });

        const fn3 = vi.fn(async () => {
            executionOrder.push(5);
            await wait(10);
            executionOrder.push(6);
            return 'third';
        });

        const promise1 = locker.lock('key1', fn1);
        const promise2 = locker.lock('key1', fn2);
        const promise3 = locker.lock('key1', fn3);

        const results = await Promise.all([promise1, promise2, promise3]);

        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);
        expect(fn3).toHaveBeenCalledTimes(1);

        expect(executionOrder).toEqual([1, 2, 3, 4, 5, 6]);
        expect(results).toEqual(['first', 'second', 'third']);
    });

    it('executes locks for different keys concurrently', async () => {
        const executionOrder: string[] = [];

        const fn1 = vi.fn(async () => {
            executionOrder.push('fn1_start');
            await wait(100);
            executionOrder.push('fn1_end');
            return 'result1';
        });

        const fn2 = vi.fn(async () => {
            executionOrder.push('fn2_start');
            await wait(50);
            executionOrder.push('fn2_end');
            return 'result2';
        });

        const promise1 = locker.lock('key1', fn1);
        const promise2 = locker.lock('key2', fn2);

        const results = await Promise.all([promise1, promise2]);

        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);

        expect(executionOrder).toEqual(['fn1_start', 'fn2_start', 'fn2_end', 'fn1_end']);

        expect(results).toEqual(['result1', 'result2']);
    });

    it('handles rejected functions and continues with the queue', async () => {
        const executionOrder: number[] = [];

        const fn1 = vi.fn(async () => {
            executionOrder.push(1);
            await wait(50);
            executionOrder.push(2);
            throw new Error('Error in fn1');
        });

        const fn2 = vi.fn(async () => {
            executionOrder.push(3);
            await wait(30);
            executionOrder.push(4);
            return 'fn2 result';
        });

        const promise1 = locker.lock('key1', fn1).catch(e => e.message);
        const promise2 = locker.lock('key1', fn2);

        const result1 = await promise1;
        const result2 = await promise2;

        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);

        expect(executionOrder).toEqual([1, 2, 3, 4]);
        expect(result1).toBe('Error in fn1');
        expect(result2).toBe('fn2 result');
    });

    it('does not interfere with locks of different keys', async () => {
        const executionOrder: string[] = [];

        const fn1 = vi.fn(async () => {
            executionOrder.push('fn1_start');
            await wait(50);
            executionOrder.push('fn1_end');
            return 'result1';
        });

        const fn2 = vi.fn(async () => {
            executionOrder.push('fn2_start');
            await wait(20);
            executionOrder.push('fn2_end');
            return 'result2';
        });

        const fn3 = vi.fn(async () => {
            executionOrder.push('fn3_start');
            await wait(10);
            executionOrder.push('fn3_end');
            return 'result3';
        });

        const promise1 = locker.lock('key1', fn1);
        const promise2 = locker.lock('key2', fn2);
        const promise3 = locker.lock('key1', fn3);

        const results = await Promise.all([promise1, promise2, promise3]);

        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);
        expect(fn3).toHaveBeenCalledTimes(1);

        expect(executionOrder).toEqual(['fn1_start', 'fn2_start', 'fn2_end', 'fn1_end', 'fn3_start', 'fn3_end']);

        expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('handles rapid successive locks correctly', async () => {
        const executionOrder: number[] = [];

        const fn = vi.fn(async (id: number) => {
            executionOrder.push(id);
            await wait(10);
            executionOrder.push(id + 100);
            return `result${id}`;
        });

        const promises: Promise<string>[] = [];
        for (let i = 1; i <= 5; i++) {
            promises.push(locker.lock('key1', () => fn(i)));
        }

        const results = await Promise.all(promises);

        expect(fn).toHaveBeenCalledTimes(5);
        expect(executionOrder).toEqual([1, 101, 2, 102, 3, 103, 4, 104, 5, 105]);
        expect(results).toEqual(['result1', 'result2', 'result3', 'result4', 'result5']);
    });
});
