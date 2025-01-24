import {describe, expect, it} from 'vitest';
import {bufStartsWith, compareUint8Array} from './utils.js';

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
