import {beforeEach, describe, expect, it, vi} from 'vitest';
import {wait} from '../utils';
import {InMemoryLocker} from './in-memory-locker';

describe('InMemoryLocker', () => {
    let locker: InMemoryLocker<string>;

    beforeEach(() => {
        locker = new InMemoryLocker<string>();
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
