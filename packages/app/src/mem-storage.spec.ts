/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it} from 'vitest';

import {createMemStorage} from './mem-storage.js';

let storage: Storage;

beforeEach(() => {
    storage = createMemStorage();
});

describe('mem-storage', () => {
    it('should set and get items using setItem/getItem', () => {
        storage.setItem('key', 'value');
        expect(storage.getItem('key')).toBe('value');
    });

    it('should return null for missing keys', () => {
        expect(storage.getItem('missing')).toBeNull();
    });

    it('should support property access (get/set)', () => {
        (storage as any).foo = 'bar';
        expect((storage as any).foo).toBe('bar');
        expect(storage.getItem('foo')).toBe('bar');
    });

    it('should convert non-string values to strings on setItem', () => {
        storage.setItem('num', 123 as any);
        expect(storage.getItem('num')).toBe('123');
    });

    it('should convert non-string keys to strings', () => {
        storage.setItem(123 as any, 'abc');
        expect(storage.getItem('123')).toBe('abc');
    });

    it('should update existing keys', () => {
        storage.setItem('key', 'one');
        storage.setItem('key', 'two');
        expect(storage.getItem('key')).toBe('two');
    });

    it('should support delete with removeItem', () => {
        storage.setItem('key', 'value');
        storage.removeItem('key');
        expect(storage.getItem('key')).toBeNull();
    });

    it('should support delete with `delete` keyword', () => {
        (storage as any).temp = 'val';
        delete (storage as any).temp;
        expect((storage as any).temp).toBeNull();
    });

    it('should clear all entries', () => {
        storage.setItem('a', '1');
        storage.setItem('b', '2');
        storage.clear();
        expect(storage.length).toBe(0);
        expect(storage.getItem('a')).toBeNull();
        expect(storage.getItem('b')).toBeNull();
    });

    it('should track length properly', () => {
        expect(storage.length).toBe(0);
        storage.setItem('x', '1');
        expect(storage.length).toBe(1);
        storage.setItem('y', '2');
        expect(storage.length).toBe(2);
        storage.removeItem('x');
        expect(storage.length).toBe(1);
    });

    it('should return key by index', () => {
        storage.setItem('a', '1');
        storage.setItem('b', '2');
        expect(storage.key(0)).toBe('a');
        expect(storage.key(1)).toBe('b');
        expect(storage.key(2)).toBeNull();
    });

    it('should support Object.keys', () => {
        storage.setItem('one', '1');
        storage.setItem('two', '2');
        const keys = Object.keys(storage);
        expect(keys).toContain('one');
        expect(keys).toContain('two');
    });

    it('should support "in" operator', () => {
        storage.setItem('a', 'value');
        expect('a' in storage).toBe(true);
        expect('missing' in storage).toBe(false);
    });

    it('should support Object.getOwnPropertyDescriptor', () => {
        storage.setItem('xyz', 'test');
        const desc = Object.getOwnPropertyDescriptor(storage, 'xyz');
        expect(desc?.enumerable).toBe(true);
        expect(desc?.value).toBe('test');
    });

    it('should not interfere with method access', () => {
        expect(typeof storage.getItem).toBe('function');
        expect(typeof storage.setItem).toBe('function');
    });

    it('should allow assigning and reading method names as keys', () => {
        (storage as any).getItem2 = 'custom';
        expect((storage as any).getItem2).toBe('custom');
        expect(storage.getItem('getItem2')).toBe('custom');
    });
});
