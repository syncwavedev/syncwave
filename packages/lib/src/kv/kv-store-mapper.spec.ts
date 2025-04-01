import {describe, expect, it} from 'vitest';
import {KvStoreMapper, TransactionMapper} from './kv-store-mapper.js';
import type {Condition, Entry, Mapper} from './kv-store.js';
import {MemMvccStore} from './mem-mvcc-store.js';

describe('TransactionMapper', () => {
    const keyMapper: Mapper<Uint8Array, string> = {
        encode: key => Buffer.from(key, 'base64'),
        decode: key => Buffer.from(key).toString('base64'),
    };

    const valueMapper: Mapper<Uint8Array, string> = {
        encode: value => Buffer.from(value, 'hex'),
        decode: value => Buffer.from(value).toString('hex'),
    };

    it('should get a value with mapped key and decode the value', async () => {
        const store = new MemMvccStore();
        await store.transact(async tx => {
            await tx.put(Uint8Array.from([1]), Uint8Array.from([42]));
        });

        const mappedTxn = new TransactionMapper(
            await store.transact(async tx => tx),
            keyMapper,
            valueMapper
        );

        const result = await mappedTxn.get(Buffer.from([1]).toString('base64'));
        expect(result).toBe(Buffer.from([42]).toString('hex'));
    });

    it('should return undefined for a missing key', async () => {
        const store = new MemMvccStore();
        const mappedTxn = new TransactionMapper(
            await store.transact(async tx => tx),
            keyMapper,
            valueMapper
        );

        const result = await mappedTxn.get(Buffer.from([2]).toString('base64'));
        expect(result).toBeUndefined();
    });

    it('should query values and decode them', async () => {
        const store = new MemMvccStore();
        await store.transact(async tx => {
            await tx.put(Uint8Array.from([2]), Uint8Array.from([100]));
            await tx.put(Uint8Array.from([3]), Uint8Array.from([200]));
        });

        const mappedTxn = new TransactionMapper(
            await store.transact(async tx => tx),
            keyMapper,
            valueMapper
        );

        const condition: Condition<string> = {
            gt: Buffer.from([2]).toString('base64'),
        };
        const results: Entry<string, string>[] = [];
        const entry$ = mappedTxn.query(condition);
        for await (const entry of entry$) {
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
        const store = new MemMvccStore();
        const mappedTxn = new TransactionMapper(
            await store.transact(async tx => tx),
            keyMapper,
            valueMapper
        );

        await mappedTxn.put(
            Buffer.from([4]).toString('base64'),
            Buffer.from([500]).toString('hex')
        );

        const result = await mappedTxn.get(Buffer.from([4]).toString('base64'));

        expect(result).toEqual(Buffer.from([500]).toString('hex'));
    });
});

describe('KvStoreMapper', () => {
    const keyMapper: Mapper<Uint8Array, string> = {
        encode: key => Buffer.from(key, 'base64'),
        decode: key => Buffer.from(key).toString('base64'),
    };

    const valueMapper: Mapper<Uint8Array, string> = {
        encode: value => Buffer.from(value, 'hex'),
        decode: value => Buffer.from(value).toString('hex'),
    };

    it('should execute a transaction with mapped keys and values', async () => {
        const store = new MemMvccStore();
        const mappedStore = new KvStoreMapper(store, keyMapper, valueMapper);

        const result = await mappedStore.transact(async tx => {
            await tx.put(
                Buffer.from([10]).toString('base64'),
                Buffer.from([1000]).toString('hex')
            );
            return await tx.get(Buffer.from([10]).toString('base64'));
        });

        expect(result).toBe(Buffer.from([1000]).toString('hex'));
    });
});
