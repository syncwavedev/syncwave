import {describe, expect, it} from 'vitest';
import {Entry} from './contracts/key-value-store';
import {InMemoryKeyValueStore} from './in-memory-key-value-store';
import {MappedKVStore, Mapper} from './mapped-key-value-store'; // Replace with the correct file path

function createMapper(): Mapper<Uint8Array, string> {
    return {
        encode: x => new TextEncoder().encode(x),
        decode: x => new TextDecoder().decode(x),
    };
}

describe('MappedKeyValueStore and MappedCursor with InMemoryKeyValueStore', () => {
    it('should map keys and values correctly on get', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        await mappedStore.put('key1', 'value1');
        const result = await mappedStore.get('key1');

        expect(result).toBe('value1');
    });

    it('should map keys and values correctly on put', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        await mappedStore.put('key2', 'value2');
        const result = await mappedStore.get('key2');

        expect(result).toBe('value2');
    });

    it('should map conditions correctly on query', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        await mappedStore.put('a', 'valueA');
        await mappedStore.put('b', 'valueB');
        await mappedStore.put('c', 'valueC');

        const cursor = await mappedStore.query({gte: 'b'});
        const results: Entry<string, string>[] = [];

        while (true) {
            const next = await cursor.next();
            if (next.type === 'done') break;
            results.push({key: next.key, value: next.value});
        }

        expect(results).toEqual([
            {key: 'b', value: 'valueB'},
            {key: 'c', value: 'valueC'},
        ]);
    });

    it('should map transactions correctly', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        await mappedStore.transaction(async txn => {
            await txn.put('key3', 'value3');
            const value = await txn.get('key3');
            expect(value).toBe('value3');
        });

        const result = await mappedStore.get('key3');
        expect(result).toBe('value3');
    });

    it('should map entries correctly on next', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        await mappedStore.put('key4', 'value4');

        const cursor = await mappedStore.query({gte: 'key4'});
        const next = await cursor.next();

        expect(next).toEqual({
            type: 'entry',
            key: 'key4',
            value: 'value4',
        });
    });

    it('should close the cursor properly', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        const cursor = await mappedStore.query({gte: 'key5'});
        await cursor.close();

        await expect(cursor.next()).rejects.toThrow();
    });

    it('should handle empty query results', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        const cursor = await mappedStore.query({gte: 'z'});
        const results: Entry<string, string>[] = [];

        while (true) {
            const next = await cursor.next();
            if (next.type === 'done') break;
            results.push(next);
        }

        expect(results).toEqual([]);
    });

    it('should handle overlapping transactions correctly', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        await mappedStore.transaction(async txn => {
            await txn.put('key6', 'value6');
        });

        await mappedStore.transaction(async txn => {
            const value = await txn.get('key6');
            expect(value).toBe('value6');
        });
    });

    it('should roll back transaction on error', async () => {
        const keyMapper = createMapper();
        const valueMapper = createMapper();

        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        await mappedStore.put('key7', 'value7');

        await expect(
            mappedStore.transaction(async txn => {
                await txn.put('key7', 'value8');
                throw new Error('Simulated error');
            })
        ).rejects.toThrow('Simulated error');

        const value = await mappedStore.get('key7');
        expect(value).toBe('value7');
    });
});
