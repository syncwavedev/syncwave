import {describe, expect, it} from 'vitest';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {Stream, toStream} from './stream.js';

describe('DeferredStream', () => {
    it('should emit values using the executor', async () => {
        const values = [1, 2, 3];
        const valueStream = new Stream<number>(({next, end}) => {
            for (const value of values) {
                const _ = next(value);
            }
            const _ = end();

            return () => {};
        });

        const result: number[] = [];
        for await (const value of valueStream) {
            result.push(value);
        }

        expect(result).toEqual(values);
    });

    it('should propagate errors from the executor', async () => {
        const error = new Error('Test error');
        const valueStream = new Stream<number>(exe => {
            const _ = exe.throw(error);
            return () => {};
        });

        await expect(async () => {
            for await (const _value of valueStream) {
                // Iterate over the stream to trigger the executor.
            }
        }).rejects.toThrow(/Test error/);
    });
});

describe('AsyncStream', () => {
    it('should convert an async iterable to an AsyncStream and back to an array', async () => {
        const values = [1, 2, 3];
        const source = (async function* () {
            for (const value of values) {
                yield value;
            }
        })();

        const result = await toStream(source).toArray();

        expect(result).toEqual(values);
    });

    it('should drop the specified number of elements', async () => {
        const values = [1, 2, 3, 4];

        const result = await toStream(values).drop(2).toArray();
        expect(result).toEqual([3, 4]);
    });

    it('should take the specified number of elements', async () => {
        const values = [1, 2, 3, 4];

        const result = await toStream(values).take(2).toArray();
        expect(result).toEqual([1, 2]);
    });

    it('should filter elements based on a predicate', async () => {
        const values = [1, 2, 3, 4];

        const result = await toStream(values)
            .filter(value => value % 2 === 0)
            .toArray();
        expect(result).toEqual([2, 4]);
    });

    it('should map parallel elements using an async mapper', async () => {
        const values = [1, 2, 3];

        const result = await toStream(values)
            .mapParallel(async value => value * 2)
            .toArray();
        expect(result).toEqual([2, 4, 6]);
    });

    it('should map elements using an async mapper', async () => {
        const values = [1, 2, 3];

        const result = await toStream(values)
            .map(async value => value * 2)
            .toArray();
        expect(result).toEqual([2, 4, 6]);
    });

    it('should find an element matching a predicate', async () => {
        const values = [1, 2, 3, 4];

        const result = await toStream(values).find(value => value > 2);
        expect(result).toBe(3);
    });

    it('should return undefined if no element matches the predicate in find', async () => {
        const values = [1, 2, 3];

        const result = await toStream(values).find(value => value > 5);
        expect(result).toBeUndefined();
    });

    it('should return true if some elements match the predicate', async () => {
        const values = [1, 2, 3];

        const result = await toStream(values).some(value => value === 2);
        expect(result).toBe(true);
    });

    it('should return false if no elements match the predicate', async () => {
        const values = [1, 2, 3];

        const result = await toStream(values).some(value => value === 5);
        expect(result).toBe(false);
    });

    it('should handle MAX_LOOKAHEAD_COUNT during map parallel', async () => {
        const values: number[] = Array(MAX_LOOKAHEAD_COUNT + 1).fill(1);

        const result = await toStream(values)
            .mapParallel(value => Promise.resolve(value + 1))
            .toArray();
        expect(result).toEqual(Array(MAX_LOOKAHEAD_COUNT + 1).fill(2));
    });
});
