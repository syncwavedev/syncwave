import {describe, expect, it} from 'vitest';
import {Condition, Entry} from '../kv-store';
import {InMemoryKeyValueStore} from './in-memory/in-memory-key-value-store';
import {MappedKVStore, MappedTransaction, Mapper, projectCondition} from './mapped-key-value-store';

describe('MappedTransaction with InMemoryKeyValueStore', () => {
    const keyMapper: Mapper<Uint8Array, string> = {
        encode: key => Buffer.from(key).toString('base64'),
        decode: key => Buffer.from(key, 'base64'),
    };

    const valueMapper: Mapper<Uint8Array, string> = {
        encode: value => Buffer.from(value).toString('hex'),
        decode: value => Buffer.from(value, 'hex'),
    };

    it('should get a value with mapped key and decode the value', async () => {
        const store = new InMemoryKeyValueStore();
        await store.transaction(async txn => {
            await txn.put(Uint8Array.from([1]), Uint8Array.from([42]));
        });

        const mappedTxn = new MappedTransaction(await store.transaction(async txn => txn), keyMapper, valueMapper);

        const result = await mappedTxn.get(Buffer.from([1]).toString('base64'));
        expect(result).toBe(Buffer.from([42]).toString('hex'));
    });

    it('should return undefined for a missing key', async () => {
        const store = new InMemoryKeyValueStore();
        const mappedTxn = new MappedTransaction(await store.transaction(async txn => txn), keyMapper, valueMapper);

        const result = await mappedTxn.get(Buffer.from([2]).toString('base64'));
        expect(result).toBeUndefined();
    });

    it('should query values and decode them', async () => {
        const store = new InMemoryKeyValueStore();
        await store.transaction(async txn => {
            await txn.put(Uint8Array.from([2]), Uint8Array.from([100]));
            await txn.put(Uint8Array.from([3]), Uint8Array.from([200]));
        });

        const mappedTxn = new MappedTransaction(await store.transaction(async txn => txn), keyMapper, valueMapper);

        const condition: Condition<string> = {gt: Buffer.from([2]).toString('base64')};
        const results: Entry<string, string>[] = [];
        for await (const entry of mappedTxn.query(condition)) {
            results.push(entry);
        }

        expect(results).toEqual([
            {
                key: Buffer.from([3]).toString('base64'),
                value: Buffer.from([200]).toString('hex'),
            },
        ]);
    });

    it('should put a value with encoded key and value', async () => {
        const store = new InMemoryKeyValueStore();
        const mappedTxn = new MappedTransaction(await store.transaction(async txn => txn), keyMapper, valueMapper);

        await mappedTxn.put(Buffer.from([4]).toString('base64'), Buffer.from([500]).toString('hex'));

        const result = await store.transaction(async txn => {
            return txn.get(Uint8Array.from([4]));
        });

        expect(result).toEqual(Uint8Array.from([500]));
    });
});

describe('MappedKVStore with InMemoryKeyValueStore', () => {
    const keyMapper: Mapper<Uint8Array, string> = {
        encode: key => Buffer.from(key).toString('base64'),
        decode: key => Buffer.from(key, 'base64'),
    };

    const valueMapper: Mapper<Uint8Array, string> = {
        encode: value => Buffer.from(value).toString('hex'),
        decode: value => Buffer.from(value, 'hex'),
    };

    it('should execute a transaction with mapped keys and values', async () => {
        const store = new InMemoryKeyValueStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        const result = await mappedStore.transaction(async txn => {
            await txn.put(Buffer.from([10]).toString('base64'), Buffer.from([1000]).toString('hex'));
            return await txn.get(Buffer.from([10]).toString('base64'));
        });

        expect(result).toBe(Buffer.from([1000]).toString('hex'));
    });
});

describe('projectCondition with InMemoryKeyValueStore', () => {
    const keyMapper: Mapper<Uint8Array, string> = {
        encode: key => Buffer.from(key).toString('base64'),
        decode: key => Buffer.from(key, 'base64'),
    };

    it('should map gt condition', () => {
        const condition = {gt: Buffer.from([5]).toString('base64')};
        const result = projectCondition(condition, keyMapper);

        expect(result).toEqual({gt: Uint8Array.from([5])});
    });

    it('should map gte condition', () => {
        const condition = {gte: Buffer.from([10]).toString('base64')};
        const result = projectCondition(condition, keyMapper);

        expect(result).toEqual({gte: Uint8Array.from([10])});
    });

    it('should map lt condition', () => {
        const condition = {lt: Buffer.from([15]).toString('base64')};
        const result = projectCondition(condition, keyMapper);

        expect(result).toEqual({lt: Uint8Array.from([15])});
    });

    it('should map lte condition', () => {
        const condition = {lte: Buffer.from([20]).toString('base64')};
        const result = projectCondition(condition, keyMapper);

        expect(result).toEqual({lte: Uint8Array.from([20])});
    });
});
