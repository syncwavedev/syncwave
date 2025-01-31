import {describe, expect, it} from 'vitest';
import {ColdStream, astream} from './async-stream.js';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {Cx} from './context.js';

const cx = Cx.test();

describe('DeferredStream', () => {
    it('should emit values using the executor', async () => {
        const values = [1, 2, 3];
        const stream = new ColdStream<number>(cx, (cx, {next, end}) => {
            for (const value of values) {
                const _ = next(cx, value);
            }
            const _ = end(cx);
        });

        const result: number[] = [];
        for await (const value of stream) {
            result.push(value);
        }

        expect(result).toEqual(values);
    });

    it('should propagate errors from the executor', async () => {
        const error = new Error('Test error');
        const stream = new ColdStream<number>(cx, (cx, exe) => {
            const _ = exe.throw(cx, error);
        });

        await expect(async () => {
            for await (const _value of stream) {
                // Iterate over the stream to trigger the executor.
            }
        }).rejects.toThrow(/HotStream.throw/);
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

        const stream = astream(source);
        const result = await stream.toArray(cx);

        expect(result).toEqual(values);
    });

    it('should drop the specified number of elements', async () => {
        const values = [1, 2, 3, 4];
        const stream = astream(values);

        const result = await stream.drop(2).toArray(cx);
        expect(result).toEqual([3, 4]);
    });

    it('should take the specified number of elements', async () => {
        const values = [1, 2, 3, 4];
        const stream = astream(values);

        const result = await stream.take(2).toArray(cx);
        expect(result).toEqual([1, 2]);
    });

    it('should filter elements based on a predicate', async () => {
        const values = [1, 2, 3, 4];
        const stream = astream(values);

        const result = await stream
            .filter(value => value % 2 === 0)
            .toArray(cx);
        expect(result).toEqual([2, 4]);
    });

    it('should map parallel elements using an async mapper', async () => {
        const values = [1, 2, 3];
        const stream = astream(values);

        const result = await stream
            .mapParallel(async (cx, value) => value * 2)
            .toArray(cx);
        expect(result).toEqual([2, 4, 6]);
    });

    it('should map elements using an async mapper', async () => {
        const values = [1, 2, 3];
        const stream = astream(values);

        const result = await stream
            .map(async (cx, value) => value * 2)
            .toArray(cx);
        expect(result).toEqual([2, 4, 6]);
    });

    it('should find an element matching a predicate', async () => {
        const values = [1, 2, 3, 4];
        const stream = astream(values);

        const result = await stream.find(value => value > 2);
        expect(result).toBe(3);
    });

    it('should return undefined if no element matches the predicate in find', async () => {
        const values = [1, 2, 3];
        const stream = astream(values);

        const result = await stream.find(value => value > 5);
        expect(result).toBeUndefined();
    });

    it('should return true if some elements match the predicate', async () => {
        const values = [1, 2, 3];
        const stream = astream(values);

        const result = await stream.some(value => value === 2);
        expect(result).toBe(true);
    });

    it('should return false if no elements match the predicate', async () => {
        const values = [1, 2, 3];
        const stream = astream(values);

        const result = await stream.some(value => value === 5);
        expect(result).toBe(false);
    });

    it('should handle MAX_LOOKAHEAD_COUNT during map parallel', async () => {
        const values = Array(MAX_LOOKAHEAD_COUNT + 1).fill(1);
        const stream = astream(values);

        const result = await stream
            .mapParallel((cx, value) => value + 1)
            .toArray(cx);
        expect(result).toEqual(Array(MAX_LOOKAHEAD_COUNT + 1).fill(2));
    });
});
