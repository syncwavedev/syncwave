import {describe, expect, it} from 'vitest';
import {assert, wait} from '../utils';
import {CursorClosedError, InMemoryKeyValueStore} from './in-memory-key-value-store'; // Replace with the correct file path
import {Entry} from './key-value-store';

function toUint8Array(str: string): Uint8Array {
    return new Uint8Array(Buffer.from(str, 'utf-8'));
}

function fromUint8Array(arr: Uint8Array): string {
    return Buffer.from(arr).toString('utf-8');
}

describe('InMemoryKeyValueStore', () => {
    it('should store and retrieve values', async () => {
        const store = new InMemoryKeyValueStore();
        const key = toUint8Array('key1');
        const value = toUint8Array('value1');

        await store.put(key, value);

        const retrievedValue = await store.get(key);
        expect(fromUint8Array(retrievedValue!)).toBe('value1');
    });

    it('should return undefined for non-existing keys', async () => {
        const store = new InMemoryKeyValueStore();
        const key = toUint8Array('nonexistent');

        const retrievedValue = await store.get(key);
        expect(retrievedValue).toBeUndefined();
    });

    it('should update values for existing keys', async () => {
        const store = new InMemoryKeyValueStore();
        const key = toUint8Array('key1');
        const value1 = toUint8Array('value1');
        const value2 = toUint8Array('value2');

        await store.put(key, value1);
        await store.put(key, value2);

        const retrievedValue = await store.get(key);
        assert(retrievedValue !== undefined);
        expect(fromUint8Array(retrievedValue)).toBe('value2');
    });

    it('should query values with conditions', async () => {
        const store = new InMemoryKeyValueStore();

        const keys = [toUint8Array('a'), toUint8Array('bb'), toUint8Array('c')];
        const values = [toUint8Array('valueA'), toUint8Array('valueB'), toUint8Array('valueC')];

        for (let i = 0; i < keys.length; i++) {
            await store.put(keys[i], values[i]);
        }

        const cursor = await store.query({gte: toUint8Array('b')});
        const result: Entry<string, string>[] = [];

        while (true) {
            const next = await cursor.next();
            if (next.type === 'done') break;
            result.push({key: fromUint8Array(next.key), value: fromUint8Array(next.value)});
        }

        expect(result).toEqual([
            {key: 'bb', value: 'valueB'},
            {key: 'c', value: 'valueC'},
        ]);
    });

    it('should close cursor properly', async () => {
        const store = new InMemoryKeyValueStore();
        const cursor = await store.query({gte: toUint8Array('a')});

        await cursor.close();

        await expect(cursor.next()).rejects.toThrow(CursorClosedError);
    });

    it('should handle empty query results', async () => {
        const store = new InMemoryKeyValueStore();
        const cursor = await store.query({gte: toUint8Array('z')});

        const result: unknown[] = [];
        while (true) {
            const next = await cursor.next();
            if (next.type === 'done') break;
            result.push(next);
        }

        expect(result).toEqual([]);
    });

    it('should throw error for invalid query conditions', async () => {
        const store = new InMemoryKeyValueStore();

        await expect(store.query({} as any)).rejects.toThrow('invalid query condition');
    });

    it('should allow multiple transactions without interference', async () => {
        const store = new InMemoryKeyValueStore();

        const key1 = toUint8Array('key1');
        const key2 = toUint8Array('key2');
        const value1 = toUint8Array('value1');
        const value2 = toUint8Array('value2');

        const order: number[] = [];

        const txn1 = store.transaction(async txn => {
            order.push(0);
            await txn.put(key1, value1);
            order.push(1);
            await wait(0);
            order.push(2);
            await txn.put(key1, value1);
            order.push(3);
        });

        const txn2 = store.transaction(async txn => {
            order.push(4);
            await txn.put(key2, value2);
            order.push(5);
            await wait(0);
            order.push(6);
            await txn.put(key2, value2);
            order.push(7);
        });

        await Promise.all([txn1, txn2]);

        const retrievedValue1 = await store.get(key1);
        const retrievedValue2 = await store.get(key2);

        assert(retrievedValue1 !== undefined);
        assert(retrievedValue2 !== undefined);

        expect(fromUint8Array(retrievedValue1)).toBe('value1');
        expect(fromUint8Array(retrievedValue2)).toBe('value2');
        expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    it('should handle large number of keys efficiently', async () => {
        const store = new InMemoryKeyValueStore();
        const keys = Array.from({length: 1000}, (_, i) => toUint8Array(`key${i}`));
        const values = Array.from({length: 1000}, (_, i) => toUint8Array(`value${i}`));

        for (let i = 0; i < keys.length; i++) {
            await store.put(keys[i], values[i]);
        }

        for (let i = 0; i < keys.length; i++) {
            const value = await store.get(keys[i]);
            assert(value !== undefined);
            expect(fromUint8Array(value)).toBe(`value${i}`);
        }
    });

    it('should rollback transaction on error', async () => {
        const store = new InMemoryKeyValueStore();
        const key = toUint8Array('key1');
        const value1 = toUint8Array('value1');
        const value2 = toUint8Array('value2');

        await store.put(key, value1);

        await expect(
            store.transaction(async txn => {
                await txn.put(key, value2);
                throw new Error('Transaction error');
            })
        ).rejects.toThrow('Transaction error');

        const retrievedValue = await store.get(key);
        assert(retrievedValue !== undefined);
        expect(fromUint8Array(retrievedValue)).toBe('value1');
    });

    it('should handle concurrent queries correctly', async () => {
        const store = new InMemoryKeyValueStore();

        const keys = [toUint8Array('a'), toUint8Array('b'), toUint8Array('c')];
        const values = [toUint8Array('valueA'), toUint8Array('valueB'), toUint8Array('valueC')];

        for (let i = 0; i < keys.length; i++) {
            await store.put(keys[i], values[i]);
        }

        const query1 = store.query({gte: toUint8Array('a')});
        const query2 = store.query({gte: toUint8Array('b')});

        const cursor1 = await query1;
        const cursor2 = await query2;

        const result1: Entry<string, string>[] = [];
        const result2: Entry<string, string>[] = [];

        while (true) {
            const next = await cursor1.next();
            if (next.type === 'done') break;
            result1.push({key: fromUint8Array(next.key), value: fromUint8Array(next.value)});
        }

        while (true) {
            const next = await cursor2.next();
            if (next.type === 'done') break;
            result2.push({key: fromUint8Array(next.key), value: fromUint8Array(next.value)});
        }

        expect(result1).toEqual([
            {key: 'a', value: 'valueA'},
            {key: 'b', value: 'valueB'},
            {key: 'c', value: 'valueC'},
        ]);

        expect(result2).toEqual([
            {key: 'b', value: 'valueB'},
            {key: 'c', value: 'valueC'},
        ]);
    });
});
