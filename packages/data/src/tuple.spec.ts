import {describe, expect, it} from 'vitest';
import {decodeTuple, encodeTuple, type Primitive} from './tuple.js';
import {compareUint8Array} from './utils.js';
import {createUuid} from './uuid.js';

describe('encodeTuple and decodeTuple', () => {
    it('should correctly encode and decode a tuple with various types', () => {
        const originalTuple: Primitive[] = [
            null,
            new Uint8Array([1, 2, 3]),
            'string',
            123,
            true,
            false,
        ];

        const encoded = encodeTuple(originalTuple);
        const decoded = decodeTuple(encoded);

        expect(decoded).toEqual(originalTuple);
    });

    it('should decode uint8array', () => {
        const buf = new Uint8Array([0x01, 0x02]);

        const result = decodeTuple(buf);

        expect(result).toEqual([new Uint8Array([0x02])]);
    });

    it('should throw an error when decoding an invalid tuple (not an array)', () => {
        const invalidBuffer = new Uint8Array([0xaf]);

        expect(() => decodeTuple(invalidBuffer)).toThrowError(
            'Invalid tuple data:'
        );
    });

    it('should throw an error when decoding a tuple with undefined', () => {
        const invalidTuple = [undefined];

        expect(() => encodeTuple(invalidTuple as any)).toThrowError(
            /Packed element cannot be undefined/
        );
    });

    it('should correctly handle an empty tuple', () => {
        const emptyTuple: Primitive[] = [];

        const encoded = encodeTuple(emptyTuple);
        const decoded = decodeTuple(encoded);

        expect(decoded).toEqual(emptyTuple);
    });

    it('should correctly decode a tuple with a single item of each type', () => {
        const singleItemTuple: Primitive[] = [
            null,
            new Uint8Array([1]),
            'string',
            42,
            true,
            false,
        ];

        const encoded = encodeTuple(singleItemTuple);
        const decoded = decodeTuple(encoded);

        expect(decoded).toEqual(singleItemTuple);
    });

    it('should throw an error when decoding a tuple with Set', () => {
        const invalidItemTuple = [new Set()];

        expect(() => encodeTuple(invalidItemTuple as any)).toThrowError(
            'Packed items must be basic types or lists'
        );
    });

    interface Testcase {
        name: string;
        a: any;
        b: any;
        result: -1 | 0 | 1;
    }

    const testcases: Testcase[] = [
        {name: '"a" < "b"', a: ['a'], b: ['b'], result: -1},
        {name: '"ab" < "b"', a: ['ab'], b: ['b'], result: -1},
        {name: '[1, 2] < [2, 0]', a: [1, 2], b: [2, 0], result: -1},
        {name: '[1, 2] > [1, null]', a: [1, 2], b: [1, null], result: 1},
        {
            name: '[1, true] > [1, 2]',
            a: [1, true],
            b: [1, 2],
            result: 1,
        },
        {
            name: '[1, true] > [1, 2, 3]',
            a: [1, true],
            b: [1, 2, 3],
            result: 1,
        },
        {name: '[1, 2] < [2]', a: [1, 2], b: [2], result: -1},
        {name: '[1, 2, 3] > [1, 2]', a: [1, 2, 3], b: [1, 2], result: 1},
        {name: '[1, 2, 3] < [2, 2]', a: [1, 2, 3], b: [2, 2], result: -1},
        {
            name: 'buf[1, 2, 3] < buf[2, 2]',
            a: [new Uint8Array([1, 2, 3])],
            b: [new Uint8Array([2, 2])],
            result: -1,
        },
    ];

    testcases.forEach(({a, b, name, result}) => {
        it(name, () => {
            expect(compareUint8Array(encodeTuple(a), encodeTuple(b))).toEqual(
                result
            );
        });
    });

    it('should ser/de uuid', () => {
        const uuid = [createUuid()];
        const buf = encodeTuple(uuid);
        const result = decodeTuple(buf);

        expect(uuid).toEqual(result);
    });
});
