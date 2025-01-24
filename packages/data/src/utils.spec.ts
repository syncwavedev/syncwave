import {assert, describe, expect, it, vi} from 'vitest';
import {
    AggregateBusinessError,
    AggregateError,
    BusinessError,
} from './errors.js';
import {
    arrayEqual,
    assertDefined,
    assertNever,
    bufStartsWith,
    compareUint8Array,
    concatBuffers,
    distinct,
    pipe,
    State,
    Subject,
    Unsubscribe,
    whenAll,
    zip,
} from './utils.js';

describe('bufStartsWith', () => {
    it('should return true if buffer starts with the given prefix', () => {
        const buf = new Uint8Array([1, 2, 3, 4, 5]);
        const prefix = new Uint8Array([1, 2, 3]);
        expect(bufStartsWith(buf, prefix)).toBe(true);
    });

    it('should return false if buffer does not start with the given prefix', () => {
        const buf = new Uint8Array([1, 2, 3, 4, 5]);
        const prefix = new Uint8Array([2, 3]);
        expect(bufStartsWith(buf, prefix)).toBe(false);
    });

    it('should return true if prefix is empty (edge case)', () => {
        const buf = new Uint8Array([1, 2, 3, 4, 5]);
        const prefix = new Uint8Array([]);
        expect(bufStartsWith(buf, prefix)).toBe(true);
    });

    it('should return false if prefix is longer than the buffer', () => {
        const buf = new Uint8Array([1, 2]);
        const prefix = new Uint8Array([1, 2, 3]);
        expect(bufStartsWith(buf, prefix)).toBe(false);
    });

    it('should return true if both buffer and prefix are empty', () => {
        const buf = new Uint8Array([]);
        const prefix = new Uint8Array([]);
        expect(bufStartsWith(buf, prefix)).toBe(true);
    });

    it('should return false if buffer is empty but prefix is not', () => {
        const buf = new Uint8Array([]);
        const prefix = new Uint8Array([1]);
        expect(bufStartsWith(buf, prefix)).toBe(false);
    });

    it('should return false if buffer starts with similar but not identical values', () => {
        const buf = new Uint8Array([1, 2, 3, 4, 5]);
        const prefix = new Uint8Array([1, 2, 4]); // 4 instead of 3
        expect(bufStartsWith(buf, prefix)).toBe(false);
    });

    it('should correctly handle large buffers and prefixes', () => {
        const buf = new Uint8Array(1000).fill(1);
        const prefix = new Uint8Array(500).fill(1);
        expect(bufStartsWith(buf, prefix)).toBe(true);
    });

    it('should return false if large buffer and prefix differ in the middle', () => {
        const buf = new Uint8Array(1000).fill(1);
        buf[499] = 2; // Change one value in the prefix range
        const prefix = new Uint8Array(500).fill(1);
        expect(bufStartsWith(buf, prefix)).toBe(false);
    });

    it('should handle single-byte buffers and prefixes', () => {
        const buf = new Uint8Array([1]);
        const prefix = new Uint8Array([1]);
        expect(bufStartsWith(buf, prefix)).toBe(true);
    });

    it('should return false if single-byte buffer and prefix do not match', () => {
        const buf = new Uint8Array([1]);
        const prefix = new Uint8Array([2]);
        expect(bufStartsWith(buf, prefix)).toBe(false);
    });
});

describe('compareUint8Array', () => {
    it('should return 0 for two equal Uint8Arrays', () => {
        const a = new Uint8Array([1, 2, 3]);
        const b = new Uint8Array([1, 2, 3]);
        expect(compareUint8Array(a, b)).toBe(0);
    });

    it('should return -1 if the first Uint8Array is lexicographically smaller', () => {
        const a = new Uint8Array([1, 2, 3]);
        const b = new Uint8Array([1, 2, 4]);
        expect(compareUint8Array(a, b)).toBe(-1);
    });

    it('should return 1 if the first Uint8Array is lexicographically larger', () => {
        const a = new Uint8Array([1, 2, 5]);
        const b = new Uint8Array([1, 2, 4]);
        expect(compareUint8Array(a, b)).toBe(1);
    });

    it('should return -1 if the first Uint8Array is shorter but matches the prefix of the second', () => {
        const a = new Uint8Array([1, 2]);
        const b = new Uint8Array([1, 2, 3]);
        expect(compareUint8Array(a, b)).toBe(-1);
    });

    it('should return 1 if the first Uint8Array is longer and matches the prefix of the second', () => {
        const a = new Uint8Array([1, 2, 3]);
        const b = new Uint8Array([1, 2]);
        expect(compareUint8Array(a, b)).toBe(1);
    });

    it('should return 0 for two empty Uint8Arrays', () => {
        const a = new Uint8Array([]);
        const b = new Uint8Array([]);
        expect(compareUint8Array(a, b)).toBe(0);
    });

    it('should return -1 if the first Uint8Array is empty and the second is not', () => {
        const a = new Uint8Array([]);
        const b = new Uint8Array([1, 2, 3]);
        expect(compareUint8Array(a, b)).toBe(-1);
    });

    it('should return 1 if the first Uint8Array is not empty and the second is empty', () => {
        const a = new Uint8Array([1, 2, 3]);
        const b = new Uint8Array([]);
        expect(compareUint8Array(a, b)).toBe(1);
    });

    it('should handle large Uint8Arrays correctly when they are equal', () => {
        const a = new Uint8Array(1000).fill(255);
        const b = new Uint8Array(1000).fill(255);
        expect(compareUint8Array(a, b)).toBe(0);
    });

    it('should handle large Uint8Arrays correctly when the first is lexicographically smaller', () => {
        const a = new Uint8Array(1000).fill(255);
        const b = new Uint8Array(1000).fill(255);
        b[999] = 254; // Make the second array lexicographically larger
        expect(compareUint8Array(a, b)).toBe(1);
    });

    it('should handle single-element Uint8Arrays', () => {
        const a = new Uint8Array([1]);
        const b = new Uint8Array([2]);
        expect(compareUint8Array(a, b)).toBe(-1);
    });

    it('should return 0 for two single-element Uint8Arrays that are equal', () => {
        const a = new Uint8Array([5]);
        const b = new Uint8Array([5]);
        expect(compareUint8Array(a, b)).toBe(0);
    });
});

describe('Subject', () => {
    it('should allow subscription and receive values', () => {
        const subject = new Subject<number>();
        const callback = vi.fn();

        const unsubscribe: Unsubscribe = subject.subscribe(callback);

        subject.next(42);

        expect(callback).toHaveBeenCalledOnce();
        expect(callback).toHaveBeenCalledWith(42);

        unsubscribe();
    });

    it('should stop receiving values after unsubscribe', () => {
        const subject = new Subject<number>();
        const callback = vi.fn();

        const unsubscribe: Unsubscribe = subject.subscribe(callback);

        subject.next(42);
        unsubscribe();
        subject.next(84);

        expect(callback).toHaveBeenCalledOnce(); // Only 42 should have triggered the callback.
    });

    it('should support multiple subscribers', () => {
        const subject = new Subject<number>();
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        subject.subscribe(callback1);
        subject.subscribe(callback2);

        subject.next(100);

        expect(callback1).toHaveBeenCalledOnce();
        expect(callback1).toHaveBeenCalledWith(100);
        expect(callback2).toHaveBeenCalledOnce();
        expect(callback2).toHaveBeenCalledWith(100);
    });

    it('should handle a subscriber unsubscribing during notification', () => {
        const subject = new Subject<number>();
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        const unsubscribe = subject.subscribe(value => {
            callback1(value);
            unsubscribe();
        });

        subject.subscribe(callback2);

        subject.next(123);
        subject.next(456);

        expect(callback1).toHaveBeenCalledOnce(); // Only called with the first value.
        expect(callback1).toHaveBeenCalledWith(123);

        expect(callback2).toHaveBeenCalledTimes(2); // Called with both values.
        expect(callback2).toHaveBeenCalledWith(123);
        expect(callback2).toHaveBeenCalledWith(456);
    });

    it('should handle the same callback subscribing multiple times independently', () => {
        const subject = new Subject<number>();
        const callback = vi.fn();

        const unsubscribe1 = subject.subscribe(callback);
        const unsubscribe2 = subject.subscribe(callback);

        subject.next(50);

        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenNthCalledWith(1, 50);
        expect(callback).toHaveBeenNthCalledWith(2, 50);

        unsubscribe1();
        subject.next(75);

        expect(callback).toHaveBeenCalledTimes(3); // Called only once more after the first unsubscribe.
        expect(callback).toHaveBeenNthCalledWith(3, 75);

        unsubscribe2();
        subject.next(100);

        expect(callback).toHaveBeenCalledTimes(3); // No more calls after both unsubscribed.
    });
});

describe('State', () => {
    it('should initialize with the given value', () => {
        const state = new State<number>(42);

        expect(state.snapshot).toBe(42);
    });

    it('should allow subscription and emit the initial value immediately', () => {
        const state = new State<number>(42);
        const callback = vi.fn();

        state.subscribe(callback);

        expect(callback).toHaveBeenCalledOnce();
        expect(callback).toHaveBeenCalledWith(42);
    });

    it('should notify subscribers of value changes', () => {
        const state = new State<number>(42);
        const callback = vi.fn();

        state.subscribe(callback);
        state.next(84);

        expect(callback).toHaveBeenCalledTimes(2); // Once for the initial value, once for the update.
        expect(callback).toHaveBeenCalledWith(42);
        expect(callback).toHaveBeenCalledWith(84);
    });

    it('should update the internal value when next is called', () => {
        const state = new State<number>(42);

        state.next(100);

        expect(state.snapshot).toBe(100);
    });

    it('should stop notifying after unsubscribe', () => {
        const state = new State<number>(42);
        const callback = vi.fn();

        const unsubscribe = state.subscribe(callback);
        state.next(84);

        unsubscribe();
        state.next(168);

        expect(callback).toHaveBeenCalledTimes(2); // Once for the initial value, once for the first update.
        expect(callback).toHaveBeenNthCalledWith(1, 42);
        expect(callback).toHaveBeenNthCalledWith(2, 84);
    });

    it('should handle multiple subscribers', () => {
        const state = new State<number>(10);
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        state.subscribe(callback1);
        state.subscribe(callback2);

        state.next(20);

        expect(callback1).toHaveBeenCalledTimes(2);
        expect(callback1).toHaveBeenCalledWith(10);
        expect(callback1).toHaveBeenCalledWith(20);

        expect(callback2).toHaveBeenCalledTimes(2);
        expect(callback2).toHaveBeenCalledWith(10);
        expect(callback2).toHaveBeenCalledWith(20);
    });

    it('should maintain independent unsubscribe behavior for multiple subscribers', () => {
        const state = new State<number>(10);
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        const unsubscribe1 = state.subscribe(callback1);
        state.subscribe(callback2);

        state.next(20);

        unsubscribe1();

        state.next(30);

        expect(callback1).toHaveBeenCalledTimes(2); // Initial value and first update.
        expect(callback1).toHaveBeenNthCalledWith(1, 10);
        expect(callback1).toHaveBeenNthCalledWith(2, 20);

        expect(callback2).toHaveBeenCalledTimes(3); // Initial value and both updates.
        expect(callback2).toHaveBeenNthCalledWith(1, 10);
        expect(callback2).toHaveBeenNthCalledWith(2, 20);
        expect(callback2).toHaveBeenNthCalledWith(3, 30);
    });

    it('should call the latest subscriber with the most recent value', () => {
        const state = new State<number>(50);
        const callback = vi.fn();

        state.next(100); // Update before subscribing.

        state.subscribe(callback);

        expect(callback).toHaveBeenCalledOnce();
        expect(callback).toHaveBeenCalledWith(100);
    });
});

describe('assertNever', () => {
    it('should throw an error when called with a non-never value', () => {
        expect(() => assertNever('unexpected' as never)).toThrowError(
            'assertNever failed: unexpected'
        );
    });
});

describe('assert', () => {
    it('should not throw an error when the expression is true', () => {
        expect(() => assert(true)).not.toThrow();
    });

    it('should throw an error when the expression is false', () => {
        expect(() => assert(false)).toThrowError();
    });
});

describe('assertDefined', () => {
    it('should return the value when it is defined', () => {
        const value = 'defined value';
        const result = assertDefined(value);
        expect(result).toBe(value);
    });

    it('should throw an error when the value is null', () => {
        expect(() => assertDefined(null)).toThrowError();
    });

    it('should throw an error when the value is undefined', () => {
        expect(() => assertDefined(undefined)).toThrowError();
    });
});

describe('pipe', () => {
    it('should return the input if no functions are provided', () => {
        const result = pipe(42);
        expect(result).toBe(42);
    });

    it('should apply a single function to the input', () => {
        const double = (x: number) => x * 2;
        const result = pipe(5, double);
        expect(result).toBe(10);
    });

    it('should apply multiple functions in sequence', () => {
        const double = (x: number) => x * 2;
        const addThree = (x: number) => x + 3;
        const square = (x: number) => x * x;

        const result = pipe(2, double, addThree, square); // ((2 * 2) + 3)^2 = 49
        expect(result).toBe(49);
    });

    it('should work with functions that return different types', () => {
        const toString = (x: number) => x.toString();
        const addExclamation = (x: string) => x + '!';
        const toUpperCase = (x: string) => x.toUpperCase();

        const result = pipe(123, toString, addExclamation, toUpperCase);
        expect(result).toBe('123!');
    });

    it('should handle an empty pipeline and return the initial value', () => {
        const result = pipe(42, ...[]);
        expect(result).toBe(42);
    });

    it('should handle a pipeline of a single function', () => {
        const increment = (x: number) => x + 1;
        const result = pipe(10, increment);
        expect(result).toBe(11);
    });

    it('should correctly handle nested pipes', () => {
        const double = (x: number) => x * 2;
        const addFive = (x: number) => x + 5;

        const innerResult = pipe(3, double, addFive); // (3 * 2) + 5 = 11
        const outerResult = pipe(innerResult, double, addFive); // (11 * 2) + 5 = 27

        expect(outerResult).toBe(27);
    });

    it('should work with large pipelines', () => {
        const increment = (x: number) => x + 1;
        const pipeline = Array(100).fill(increment); // A pipeline of 100 increments

        const result = (pipe as any)(0, ...pipeline);
        expect(result).toBe(100);
    });
});

describe('concatBuffers', () => {
    it('should concatenate two Uint8Array buffers', () => {
        const bufferA = new Uint8Array([1, 2, 3]);
        const bufferB = new Uint8Array([4, 5, 6]);

        const result = concatBuffers(bufferA, bufferB);

        expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it('should return an identical buffer when concatenating with an empty buffer (first argument empty)', () => {
        const bufferA = new Uint8Array([]);
        const bufferB = new Uint8Array([7, 8, 9]);

        const result = concatBuffers(bufferA, bufferB);

        expect(result).toEqual(bufferB);
    });

    it('should return an identical buffer when concatenating with an empty buffer (second argument empty)', () => {
        const bufferA = new Uint8Array([10, 11, 12]);
        const bufferB = new Uint8Array([]);

        const result = concatBuffers(bufferA, bufferB);

        expect(result).toEqual(bufferA);
    });

    it('should return an empty buffer when concatenating two empty buffers', () => {
        const bufferA = new Uint8Array([]);
        const bufferB = new Uint8Array([]);

        const result = concatBuffers(bufferA, bufferB);

        expect(result).toEqual(new Uint8Array([]));
    });

    it('should not mutate the input buffers', () => {
        const bufferA = new Uint8Array([1, 2, 3]);
        const bufferB = new Uint8Array([4, 5, 6]);

        concatBuffers(bufferA, bufferB);

        expect(bufferA).toEqual(new Uint8Array([1, 2, 3]));
        expect(bufferB).toEqual(new Uint8Array([4, 5, 6]));
    });

    it('should correctly handle large buffers', () => {
        const bufferA = new Uint8Array(1000).fill(1);
        const bufferB = new Uint8Array(2000).fill(2);

        const result = concatBuffers(bufferA, bufferB);

        expect(result.length).toBe(3000);
        expect(result.slice(0, 1000)).toEqual(new Uint8Array(1000).fill(1));
        expect(result.slice(1000)).toEqual(new Uint8Array(2000).fill(2));
    });
});

describe('distinct', () => {
    it('should return an array with unique elements', () => {
        const items = [1, 2, 2, 3, 3, 3, 4];
        const result = distinct(items);
        expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should handle an empty array', () => {
        const items: number[] = [];
        const result = distinct(items);
        expect(result).toEqual([]);
    });

    it('should handle an array with all identical elements', () => {
        const items = [5, 5, 5, 5];
        const result = distinct(items);
        expect(result).toEqual([5]);
    });

    it('should preserve the order of the first occurrences', () => {
        const items = [3, 1, 2, 1, 3, 4, 2];
        const result = distinct(items);
        expect(result).toEqual([3, 1, 2, 4]);
    });

    it('should work with non-primitive types', () => {
        const items = [{id: 1}, {id: 2}, {id: 1}];
        const result = distinct(items);
        // Sets don't handle object equality, so this won't remove duplicates.
        expect(result).toEqual(items);
    });
});

describe('zip', () => {
    it('should zip two arrays of the same length', () => {
        const arrayA = [1, 2, 3];
        const arrayB = ['a', 'b', 'c'];

        const result = zip(arrayA, arrayB);
        expect(result).toEqual([
            [1, 'a'],
            [2, 'b'],
            [3, 'c'],
        ]);
    });

    it('should throw an error if arrays have different lengths', () => {
        const arrayA = [1, 2];
        const arrayB = ['a', 'b', 'c'];

        expect(() => zip(arrayA, arrayB)).toThrowError('assertion failed');
    });

    it('should handle empty arrays', () => {
        const arrayA: number[] = [];
        const arrayB: string[] = [];

        const result = zip(arrayA, arrayB);
        expect(result).toEqual([]);
    });

    it('should handle arrays with complex objects', () => {
        const arrayA = [{id: 1}, {id: 2}];
        const arrayB = [{name: 'Alice'}, {name: 'Bob'}];

        const result = zip(arrayA, arrayB);
        expect(result).toEqual([
            [{id: 1}, {name: 'Alice'}],
            [{id: 2}, {name: 'Bob'}],
        ]);
    });

    it('should handle arrays of different types', () => {
        const arrayA = [true, false];
        const arrayB = [1, 0];

        const result = zip(arrayA, arrayB);
        expect(result).toEqual([
            [true, 1],
            [false, 0],
        ]);
    });
});

describe('arrayEqual', () => {
    it('should return true for identical arrays', () => {
        const a = [1, 2, 3];
        const b = [1, 2, 3];
        expect(arrayEqual(a, b)).toBe(true);
    });

    it('should return false for arrays of different lengths', () => {
        const a = [1, 2];
        const b = [1, 2, 3];
        expect(arrayEqual(a, b)).toBe(false);
    });

    it('should return false for arrays with different elements', () => {
        const a = [1, 2, 3];
        const b = [1, 2, 4];
        expect(arrayEqual(a, b)).toBe(false);
    });

    it('should return true for empty arrays', () => {
        const a: number[] = [];
        const b: number[] = [];
        expect(arrayEqual(a, b)).toBe(true);
    });

    it('should handle arrays with different types', () => {
        const a = ['a', 'b', 'c'];
        const b = ['a', 'b', 'c'];
        expect(arrayEqual(a, b)).toBe(true);

        const c = ['a', 'b', 'd'];
        expect(arrayEqual(a, c)).toBe(false);
    });
});

describe('whenAll', () => {
    it('should resolve with all results when all promises succeed', async () => {
        const promises = [
            Promise.resolve(1),
            Promise.resolve(2),
            Promise.resolve(3),
        ];
        const result = await whenAll(promises);
        expect(result).toEqual([1, 2, 3]);
    });

    it('should throw the single rejection reason if one promise rejects', async () => {
        const promises = [
            Promise.resolve(1),
            Promise.reject(new Error('Test Error')),
            Promise.resolve(3),
        ];

        await expect(whenAll(promises)).rejects.toThrowError('Test Error');
    });

    it('should throw AggregateError if multiple promises reject', async () => {
        const promises = [
            Promise.reject(new Error('Error 1')),
            Promise.reject(new Error('Error 2')),
            Promise.resolve(3),
        ];

        await expect(whenAll(promises)).rejects.toThrow(AggregateError);
    });

    it('should throw AggregateBusinessError if all rejections are BusinessErrors', async () => {
        const promises = [
            Promise.reject(new BusinessError('Business Error 1', 'forbidden')),
            Promise.reject(new BusinessError('Business Error 2', 'forbidden')),
        ];

        await expect(whenAll(promises)).rejects.toThrow(AggregateBusinessError);
    });

    it('should handle a mix of fulfilled and rejected promises', async () => {
        const promises = [
            Promise.resolve(1),
            Promise.reject(new BusinessError('Business Error', 'forbidden')),
            Promise.resolve(3),
        ];

        await expect(whenAll(promises)).rejects.toThrow(BusinessError);
    });

    it('should resolve with an empty array when no promises are provided', async () => {
        const promises: Promise<any>[] = [];
        const result = await whenAll(promises);
        expect(result).toEqual([]);
    });
});
