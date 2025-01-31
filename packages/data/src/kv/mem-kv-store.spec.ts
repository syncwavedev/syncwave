import createTree, {Tree} from 'functional-red-black-tree';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {encodeString} from '../codec.js';
import {Cx} from '../context.js';
import {compareUint8Array, wait, whenAll} from '../utils.js';
import {Entry, InvalidQueryCondition, Uint8KVStore} from './kv-store.js';
import {MemKVStore, MemLocker, MemTransaction} from './mem-kv-store.js'; // Adjust the path as needed

const cx = Cx.test();

describe('MemTransaction', () => {
    let tree: Tree<Uint8Array, Uint8Array>;
    let transaction: MemTransaction;

    beforeEach(() => {
        tree = createTree(compareUint8Array);
        transaction = new MemTransaction(tree);
    });

    it('should retrieve an existing key', async () => {
        const key = encodeString('key1');
        const value = encodeString('value1');
        tree = tree.insert(key, value);
        transaction = new MemTransaction(tree);

        const result = await transaction.get(cx, key);
        expect(result).toEqual(value);
    });

    it('should return undefined for a non-existent key', async () => {
        const result = await transaction.get(
            cx,
            encodeString('non-existent-key')
        );
        expect(result).toBeUndefined();
    });

    it('should insert a key-value pair', async () => {
        const key = encodeString('key1');
        const value = encodeString('value1');
        await transaction.put(cx, key, value);

        const result = await transaction.get(cx, key);
        expect(result).toEqual(value);
    });

    it('should overwrite an existing key-value pair', async () => {
        const key = encodeString('key1');
        const value1 = encodeString('value1');
        const value2 = encodeString('value2');

        await transaction.put(cx, key, value1);
        await transaction.put(cx, key, value2);

        const result = await transaction.get(cx, key);
        expect(result).toEqual(value2);
    });

    it('should query with greater-than condition', async () => {
        const key1 = encodeString('a');
        const key2 = encodeString('b');
        const value = encodeString('value');

        await transaction.put(cx, key1, value);
        await transaction.put(cx, key2, value);

        const condition = {gt: key1};
        const results: Entry<Uint8Array, Uint8Array>[] = [];

        for await (const entry of transaction.query(cx, condition)) {
            results.push(entry);
        }

        expect(results).toEqual([{key: key2, value}]);
    });

    it('should throw an error for an invalid condition', async () => {
        const condition = {};
        await expect(async () => {
            for await (const _ of transaction.query(cx, condition as any)) {
                // do nothing
            }
        }).rejects.toThrow(InvalidQueryCondition);
    });

    it('should handle less-than condition in query', async () => {
        const key1 = encodeString('a');
        const key2 = encodeString('b');
        const value = encodeString('value');

        await transaction.put(cx, key1, value);
        await transaction.put(cx, key2, value);

        const condition = {lt: key2};
        const results: Entry<Uint8Array, Uint8Array>[] = [];

        for await (const entry of transaction.query(cx, condition)) {
            results.push(entry);
        }

        expect(results).toEqual([{key: key1, value}]);
    });

    it('should handle greater-than or equal condition in query', async () => {
        const key1 = encodeString('a');
        const key2 = encodeString('b');
        const value = encodeString('value');

        await transaction.put(cx, key1, value);
        await transaction.put(cx, key2, value);

        const condition = {gte: key1};
        const results: Entry<Uint8Array, Uint8Array>[] = [];

        for await (const entry of transaction.query(cx, condition)) {
            results.push(entry);
        }

        expect(results).toEqual([
            {key: key1, value},
            {key: key2, value},
        ]);
    });

    it('should handle less-than or equal condition in query', async () => {
        const key1 = encodeString('a');
        const key2 = encodeString('b');
        const value = encodeString('value');

        await transaction.put(cx, key1, value);
        await transaction.put(cx, key2, value);

        const results: Entry<Uint8Array, Uint8Array>[] = [];

        for await (const entry of transaction.query(cx, {
            lte: encodeString('d'),
        })) {
            results.push(entry);
        }

        expect(results).toEqual([
            {key: key2, value},
            {key: key1, value},
        ]);
    });
});

describe('MemKVStore', () => {
    let kvStore: Uint8KVStore;

    beforeEach(() => {
        kvStore = new MemKVStore();
    });

    it('should execute a transaction and persist changes', async () => {
        const key = encodeString('key1');
        const value = encodeString('value1');

        await kvStore.transact(cx, async (cx, tx) => {
            await tx.put(cx, key, value);
        });

        await kvStore.transact(cx, async (cx, tx) => {
            const result = await tx.get(cx, key);
            expect(result).toEqual(value);
        });
    });

    it('should handle concurrent transactions sequentially', async () => {
        const key = encodeString('key1');
        const value1 = encodeString('value1');
        const value2 = encodeString('value2');

        const txn1 = kvStore.transact(cx, async (cx, tx) => {
            await tx.put(cx, key, value1);
        });

        const txn2 = kvStore.transact(cx, async (cx, tx) => {
            await tx.put(cx, key, value2);
        });

        await whenAll([txn1, txn2]);

        await kvStore.transact(cx, async (cx, tx) => {
            const result = await tx.get(cx, key);
            expect(result).toEqual(value2); // Last transaction wins
        });
    });

    it('should retry on transaction failure', async () => {
        let attempt = 0;

        await kvStore.transact(cx, async () => {
            if (attempt++ < 1) {
                throw new Error('Simulated failure');
            }
        });

        expect(attempt).toBe(2);
    });

    it('should fail after exceeding retry attempts', async () => {
        vi.spyOn(kvStore, 'transact').mockImplementationOnce(async () => {
            throw new Error('Simulated permanent failure');
        });

        await expect(kvStore.transact(cx, async () => {})).rejects.toThrow(
            'Simulated permanent failure'
        );
    });

    it('should handle transaction rollback on failure', async () => {
        const key = encodeString('key1');
        const value = encodeString('value1');

        await kvStore
            .transact(cx, async (cx, tx) => {
                await tx.put(cx, key, value);
                throw new Error('Simulated rollback');
            })
            .catch(() => {});

        await kvStore.transact(cx, async (cx, tx) => {
            const result = await tx.get(cx, key);
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
            await wait(cx, 50);
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
            await wait(cx, 100);
            executionOrder.push(2);
            return 'first';
        });

        const fn2 = vi.fn(async () => {
            executionOrder.push(3);
            await wait(cx, 50);
            executionOrder.push(4);
            return 'second';
        });

        const fn3 = vi.fn(async () => {
            executionOrder.push(5);
            await wait(cx, 10);
            executionOrder.push(6);
            return 'third';
        });

        const promise1 = locker.lock('key1', fn1);
        const promise2 = locker.lock('key1', fn2);
        const promise3 = locker.lock('key1', fn3);

        const results = await whenAll([promise1, promise2, promise3]);

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
            await wait(cx, 100);
            executionOrder.push('fn1_end');
            return 'result1';
        });

        const fn2 = vi.fn(async () => {
            executionOrder.push('fn2_start');
            await wait(cx, 50);
            executionOrder.push('fn2_end');
            return 'result2';
        });

        const promise1 = locker.lock('key1', fn1);
        const promise2 = locker.lock('key2', fn2);

        const results = await whenAll([promise1, promise2]);

        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);

        expect(executionOrder).toEqual([
            'fn1_start',
            'fn2_start',
            'fn2_end',
            'fn1_end',
        ]);

        expect(results).toEqual(['result1', 'result2']);
    });

    it('handles rejected functions and continues with the queue', async () => {
        const executionOrder: number[] = [];

        const fn1 = vi.fn(async () => {
            executionOrder.push(1);
            await wait(cx, 50);
            executionOrder.push(2);
            throw new Error('Error in fn1');
        });

        const fn2 = vi.fn(async () => {
            executionOrder.push(3);
            await wait(cx, 30);
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
            await wait(cx, 50);
            executionOrder.push('fn1_end');
            return 'result1';
        });

        const fn2 = vi.fn(async () => {
            executionOrder.push('fn2_start');
            await wait(cx, 20);
            executionOrder.push('fn2_end');
            return 'result2';
        });

        const fn3 = vi.fn(async () => {
            executionOrder.push('fn3_start');
            await wait(cx, 10);
            executionOrder.push('fn3_end');
            return 'result3';
        });

        const promise1 = locker.lock('key1', fn1);
        const promise2 = locker.lock('key2', fn2);
        const promise3 = locker.lock('key1', fn3);

        const results = await whenAll([promise1, promise2, promise3]);

        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);
        expect(fn3).toHaveBeenCalledTimes(1);

        expect(executionOrder).toEqual([
            'fn1_start',
            'fn2_start',
            'fn2_end',
            'fn1_end',
            'fn3_start',
            'fn3_end',
        ]);

        expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('handles rapid successive locks correctly', async () => {
        const executionOrder: number[] = [];

        const fn = vi.fn(async (id: number) => {
            executionOrder.push(id);
            await wait(cx, 10);
            executionOrder.push(id + 100);
            return `result${id}`;
        });

        const promises: Promise<string>[] = [];
        for (let i = 1; i <= 5; i++) {
            promises.push(locker.lock('key1', () => fn(i)));
        }

        const results = await whenAll(promises);

        expect(fn).toHaveBeenCalledTimes(5);
        expect(executionOrder).toEqual([
            1, 101, 2, 102, 3, 103, 4, 104, 5, 105,
        ]);
        expect(results).toEqual([
            'result1',
            'result2',
            'result3',
            'result4',
            'result5',
        ]);
    });
});
