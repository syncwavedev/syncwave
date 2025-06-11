import {assert, describe, expect, it, vi} from 'vitest';
import {
    AggregateBusinessError,
    AggregateError,
    AppError,
    BusinessError,
} from './errors.js';
import {
    arrayEqual,
    assertDefined,
    assertNever,
    compareUint8Array,
    concatBuffers,
    distinct,
    drop,
    equals,
    getRequiredKey,
    isBufferStartsWith,
    partition,
    pipe,
    run,
    shuffle,
    uniqBy,
    whenAll,
    zip,
} from './utils.js';

describe('bufStartsWith', () => {
    it('should return true if buffer starts with the given prefix', () => {
        const buf = new Uint8Array([1, 2, 3, 4, 5]);
        const prefix = new Uint8Array([1, 2, 3]);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(true);
    });

    it('should return false if buffer does not start with the given prefix', () => {
        const buf = new Uint8Array([1, 2, 3, 4, 5]);
        const prefix = new Uint8Array([2, 3]);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(false);
    });

    it('should return true if prefix is empty (edge case)', () => {
        const buf = new Uint8Array([1, 2, 3, 4, 5]);
        const prefix = new Uint8Array([]);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(true);
    });

    it('should return false if prefix is longer than the buffer', () => {
        const buf = new Uint8Array([1, 2]);
        const prefix = new Uint8Array([1, 2, 3]);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(false);
    });

    it('should return true if both buffer and prefix are empty', () => {
        const buf = new Uint8Array([]);
        const prefix = new Uint8Array([]);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(true);
    });

    it('should return false if buffer is empty but prefix is not', () => {
        const buf = new Uint8Array([]);
        const prefix = new Uint8Array([1]);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(false);
    });

    it('should return false if buffer starts with similar but not identical values', () => {
        const buf = new Uint8Array([1, 2, 3, 4, 5]);
        const prefix = new Uint8Array([1, 2, 4]); // 4 instead of 3
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(false);
    });

    it('should correctly handle large buffers and prefixes', () => {
        const buf = new Uint8Array(1000).fill(1);
        const prefix = new Uint8Array(500).fill(1);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(true);
    });

    it('should return false if large buffer and prefix differ in the middle', () => {
        const buf = new Uint8Array(1000).fill(1);
        buf[499] = 2; // Change one value in the prefix range
        const prefix = new Uint8Array(500).fill(1);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(false);
    });

    it('should handle single-byte buffers and prefixes', () => {
        const buf = new Uint8Array([1]);
        const prefix = new Uint8Array([1]);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(true);
    });

    it('should return false if single-byte buffer and prefix do not match', () => {
        const buf = new Uint8Array([1]);
        const prefix = new Uint8Array([2]);
        expect(isBufferStartsWith({buffer: buf, prefix})).toBe(false);
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
        const result = assertDefined(value, 'test assert');
        expect(result).toBe(value);
    });

    it('should throw an error when the value is null', () => {
        expect(() => assertDefined(null, 'test assert')).toThrowError();
    });

    it('should throw an error when the value is undefined', () => {
        expect(() => assertDefined(undefined, 'test assert')).toThrowError();
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

        const result = (pipe as any)(0, ...pipeline) as unknown;
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

describe('uniqBy', () => {
    it('should return an array with unique elements based on an object key', () => {
        const items = [
            {id: 1, name: 'a'},
            {id: 2, name: 'b'},
            {id: 1, name: 'c'}, // Duplicate id
            {id: 3, name: 'd'},
        ];
        const result = uniqBy(items, item => item.id);
        expect(result).toEqual([
            {id: 1, name: 'a'},
            {id: 2, name: 'b'},
            {id: 3, name: 'd'},
        ]);
    });

    it('should preserve the order of the first occurrences', () => {
        const items = [
            {group: 'a', value: 1},
            {group: 'b', value: 2},
            {group: 'a', value: 3},
            {group: 'c', value: 4},
            {group: 'b', value: 5},
        ];
        const result = uniqBy(items, item => item.group);
        expect(result).toEqual([
            {group: 'a', value: 1},
            {group: 'b', value: 2},
            {group: 'c', value: 4},
        ]);
    });

    it('should handle an empty array', () => {
        const items: {id: number}[] = [];
        const result = uniqBy(items, item => item.id);
        expect(result).toEqual([]);
    });

    it('should return the original array if all item keys are unique', () => {
        const items = [
            {id: 1, name: 'a'},
            {id: 2, name: 'b'},
            {id: 3, name: 'c'},
        ];
        const originalItems = [...items];
        const result = uniqBy(items, item => item.id);
        expect(result).toEqual(originalItems);
    });

    it('should handle an array where all items have the same key', () => {
        const items = [
            {id: 1, value: 10},
            {id: 1, value: 20},
            {id: 1, value: 30},
        ];
        const result = uniqBy(items, item => item.id);
        expect(result).toEqual([{id: 1, value: 10}]);
    });

    it('should work with string keys', () => {
        const items = [
            {name: 'apple', color: 'red'},
            {name: 'banana', color: 'yellow'},
            {name: 'apple', color: 'green'}, // Duplicate name
        ];
        const result = uniqBy(items, item => item.name);
        expect(result).toEqual([
            {name: 'apple', color: 'red'},
            {name: 'banana', color: 'yellow'},
        ]);
    });

    it('should work with primitive types in the array', () => {
        const items = [1, 2, 2, 3, 1, 4, 5, 4];
        const result = uniqBy(items, item => item);
        expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should work with a nested key', () => {
        const items = [
            {data: {id: 1}, value: 'a'},
            {data: {id: 2}, value: 'b'},
            {data: {id: 1}, value: 'c'},
        ];
        const result = uniqBy(items, item => item.data.id);
        expect(result).toEqual([
            {data: {id: 1}, value: 'a'},
            {data: {id: 2}, value: 'b'},
        ]);
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
            Promise.reject(new AppError('Test Error')),
            Promise.resolve(3),
        ];

        await expect(whenAll(promises)).rejects.toThrowError('Test Error');
    });

    it('should throw AggregateError if multiple promises reject', async () => {
        const promises = [
            Promise.reject(new AppError('Error 1')),
            Promise.reject(new AppError('Error 2')),
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

describe('equals', () => {
    it('should return true for identical primitive values', () => {
        expect(equals(42, 42)).toBe(true);
        expect(equals('hello', 'hello')).toBe(true);
        expect(equals(true, true)).toBe(true);
        expect(equals(null, null)).toBe(true);
        expect(equals(undefined, undefined)).toBe(true);
    });

    it('should return false for different primitive values', () => {
        expect(equals(42, 43)).toBe(false);
        expect(equals('hello', 'world')).toBe(false);
        expect(equals(true, false)).toBe(false);
        expect(equals(null, undefined)).toBe(false);
        expect(equals(42, '42')).toBe(false);
    });

    it('should compare Uint8Arrays correctly', () => {
        const a1 = new Uint8Array([1, 2, 3]);
        const a2 = new Uint8Array([1, 2, 3]);
        const a3 = new Uint8Array([1, 2, 4]);
        const a4 = new Uint8Array([1, 2]);

        expect(equals(a1, a2)).toBe(true);
        expect(equals(a1, a3)).toBe(false);
        expect(equals(a1, a4)).toBe(false);
    });

    it('should compare Date objects correctly', () => {
        const d1 = new Date('2023-01-01');
        const d2 = new Date('2023-01-01');
        const d3 = new Date('2023-01-02');

        expect(equals(d1, d2)).toBe(true);
        expect(equals(d1, d3)).toBe(false);
    });

    it('should compare RegExp objects correctly', () => {
        const r1 = /test/g;
        const r2 = /test/g;
        const r3 = /test/i;
        const r4 = /other/g;

        expect(equals(r1, r2)).toBe(true);
        expect(equals(r1, r3)).toBe(false);
        expect(equals(r1, r4)).toBe(false);
    });

    it('should compare Sets correctly', () => {
        const s1 = new Set([1, 2, 3]);
        const s2 = new Set([1, 2, 3]);
        const s3 = new Set([1, 2, 4]);
        const s4 = new Set([1, 2]);

        expect(equals(s1, s2)).toBe(true);
        expect(equals(s1, s3)).toBe(false);
        expect(equals(s1, s4)).toBe(false);
    });

    it('should compare Maps correctly', () => {
        const m1 = new Map([
            ['a', 1],
            ['b', 2],
        ]);
        const m2 = new Map([
            ['a', 1],
            ['b', 2],
        ]);
        const m3 = new Map([
            ['a', 1],
            ['b', 3],
        ]);
        const m4 = new Map([['a', 1]]);

        expect(equals(m1, m2)).toBe(true);
        expect(equals(m1, m3)).toBe(false);
        expect(equals(m1, m4)).toBe(false);
    });

    it('should compare arrays correctly', () => {
        const a1 = [1, 2, 3];
        const a2 = [1, 2, 3];
        const a3 = [1, 2, 4];
        const a4 = [1, 2];

        expect(equals(a1, a2)).toBe(true);
        expect(equals(a1, a3)).toBe(false);
        expect(equals(a1, a4)).toBe(false);
    });

    it('should compare objects correctly', () => {
        const o1 = {a: 1, b: 2};
        const o2 = {a: 1, b: 2};
        const o3 = {a: 1, b: 3};
        const o4 = {a: 1};
        const o5 = {a: 1, b: 2, c: 3};

        expect(equals(o1, o2)).toBe(true);
        expect(equals(o1, o3)).toBe(false);
        expect(equals(o1, o4)).toBe(false);
        expect(equals(o1, o5)).toBe(false);
    });

    it('should compare nested structures correctly', () => {
        const n1 = {
            a: 1,
            b: [1, 2, {c: 3}],
            d: new Set([1, 2]),
        };

        const n2 = {
            a: 1,
            b: [1, 2, {c: 3}],
            d: new Set([1, 2]),
        };

        const n3 = {
            a: 1,
            b: [1, 2, {c: 4}], // Different value
            d: new Set([1, 2]),
        };

        expect(equals(n1, n2)).toBe(true);
        expect(equals(n1, n3)).toBe(false);
    });

    it('should handle empty data structures', () => {
        expect(equals([], [])).toBe(true);
        expect(equals({}, {})).toBe(true);
        expect(equals(new Set(), new Set())).toBe(true);
        expect(equals(new Map(), new Map())).toBe(true);
    });
});

describe('partition', () => {
    it('should partition an array based on a boolean predicate', () => {
        const numbers = [1, 2, 3, 4, 5];
        const [evens, odds] = partition(numbers, n => n % 2 === 0);

        expect(evens).toEqual([2, 4]);
        expect(odds).toEqual([1, 3, 5]);
    });

    it('should work with type predicates', () => {
        const items = [1, 'two', 3, 'four', 5];
        const isString = (x: unknown): x is string => typeof x === 'string';

        const [strings, numbers] = partition(items, isString);

        expect(strings).toEqual(['two', 'four']);
        expect(numbers).toEqual([1, 3, 5]);
    });

    it('should handle empty arrays', () => {
        const empty: number[] = [];
        const [truthy, falsy] = partition(empty, n => n > 0);

        expect(truthy).toEqual([]);
        expect(falsy).toEqual([]);
    });

    it('should handle all elements matching the predicate', () => {
        const allPositive = [1, 2, 3, 4, 5];
        const [positive, negative] = partition(allPositive, n => n > 0);

        expect(positive).toEqual([1, 2, 3, 4, 5]);
        expect(negative).toEqual([]);
    });

    it('should handle no elements matching the predicate', () => {
        const allNegative = [-1, -2, -3, -4, -5];
        const [positive, negative] = partition(allNegative, n => n > 0);

        expect(positive).toEqual([]);
        expect(negative).toEqual([-1, -2, -3, -4, -5]);
    });

    it('should work with complex predicates', () => {
        const people = [
            {name: 'Alice', age: 25},
            {name: 'Bob', age: 17},
            {name: 'Charlie', age: 30},
            {name: 'Dave', age: 12},
        ];

        const [adults, minors] = partition(people, person => person.age >= 18);

        expect(adults).toEqual([
            {name: 'Alice', age: 25},
            {name: 'Charlie', age: 30},
        ]);
        expect(minors).toEqual([
            {name: 'Bob', age: 17},
            {name: 'Dave', age: 12},
        ]);
    });
});

describe('shuffle', () => {
    it('should return an array of the same length', () => {
        const original = [1, 2, 3, 4, 5];
        const shuffled = shuffle([...original]);

        expect(shuffled.length).toBe(original.length);
    });

    it('should contain the same elements as the original array', () => {
        const original = [1, 2, 3, 4, 5];
        const shuffled = shuffle([...original]);

        expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should handle empty arrays', () => {
        const empty: number[] = [];
        const result = shuffle(empty);

        expect(result).toEqual([]);
    });

    it('should handle arrays with a single element', () => {
        const single = [42];
        const result = shuffle(single);

        expect(result).toEqual([42]);
    });

    it('should sometimes change the order of elements (non-deterministic)', () => {
        // This is a probabilistic test; it could theoretically fail
        // even with a correct implementation, but the probability is tiny
        const original = Array.from({length: 100}, (_, i) => i);
        let allSame = true;

        // Run shuffle multiple times
        for (let i = 0; i < 5; i++) {
            const shuffled = shuffle([...original]);

            // Check if any element's position changed
            if (!arrayEqual(original, shuffled)) {
                allSame = false;
                break;
            }
        }

        expect(allSame).toBe(false);
    });
});

describe('drop', () => {
    it('should return undefined regardless of input', () => {
        expect(drop(42)).toBe(undefined);
        expect(drop('hello')).toBe(undefined);
        expect(drop({key: 'value'})).toBe(undefined);
        expect(drop([1, 2, 3])).toBe(undefined);
    });

    it('should accept any type of input', () => {
        expect(() => drop(null)).not.toThrow();
        expect(() => drop(undefined)).not.toThrow();
        expect(() => drop(() => {})).not.toThrow();
        expect(() => drop(Symbol('test'))).not.toThrow();
    });
});

describe('getRequiredKey', () => {
    it('should return the value when the key exists', () => {
        const obj = {name: 'Test', value: 42};
        const error = new AppError('Key not found');

        expect(getRequiredKey(obj, 'name', error)).toBe('Test');
        expect(getRequiredKey(obj, 'value', error)).toBe(42);
    });

    it('should throw the provided error when the key does not exist', () => {
        const obj = {name: 'Test'};
        const error = new AppError('Missing key: age');

        expect(() =>
            getRequiredKey(obj, 'age' as keyof typeof obj, error)
        ).toThrow(error);
    });

    it('should throw when the key value is undefined', () => {
        const obj = {name: 'Test', age: undefined};
        const error = new AppError('Age is required');

        expect(() => getRequiredKey(obj, 'age', error)).toThrow(error);
    });

    it('should work with complex objects', () => {
        const complex = {
            user: {
                profile: {
                    details: {
                        name: 'Test User',
                    },
                },
            },
        };
        const error = new AppError('Key not found');

        expect(getRequiredKey(complex, 'user', error)).toBe(complex.user);
    });

    it('should accept falsy values other than undefined', () => {
        const obj = {count: 0, empty: '', isActive: false};
        const error = new AppError('Key not found');

        expect(getRequiredKey(obj, 'count', error)).toBe(0);
        expect(getRequiredKey(obj, 'empty', error)).toBe('');
        expect(getRequiredKey(obj, 'isActive', error)).toBe(false);
    });
});

describe('run', () => {
    it('should call the function and return its result', () => {
        const fn = () => 42;
        expect(run(fn)).toBe(42);
    });

    it('should work with functions returning different types', () => {
        expect(run(() => 'hello')).toBe('hello');
        expect(run(() => true)).toBe(true);
        expect(run(() => null)).toBe(null);
        expect(run(() => ({key: 'value'}))).toEqual({key: 'value'});
    });

    it('should propagate errors thrown by the function', () => {
        const errorFn = () => {
            throw new AppError('Test error');
        };

        expect(() => run(errorFn)).toThrow('Test error');
    });

    it('should pass through the function execution context', () => {
        const mockFn = vi.fn();
        run(mockFn);

        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should work with complex functions', () => {
        const complexFn = () => {
            const result: number[] = [];
            for (let i = 0; i < 5; i++) {
                result.push(i * i);
            }
            return result;
        };

        expect(run(complexFn)).toEqual([0, 1, 4, 9, 16]);
    });
});
