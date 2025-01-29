import {describe, expect, it} from 'vitest';
import {Context} from '../context.js';
import {Condition, Entry} from './kv-store.js';
import {MappedKVStore, MappedTransaction, Mapper} from './mapped-kv-store.js';
import {MemKVStore} from './mem-kv-store.js';

const ctx = Context.test();

describe('MappedTransaction with MemKVStore', () => {
    const keyMapper: Mapper<Uint8Array, string> = {
        encode: key => Buffer.from(key, 'base64'),
        decode: key => Buffer.from(key).toString('base64'),
    };

    const valueMapper: Mapper<Uint8Array, string> = {
        encode: value => Buffer.from(value, 'hex'),
        decode: value => Buffer.from(value).toString('hex'),
    };

    it('should get a value with mapped key and decode the value', async () => {
        const store = new MemKVStore();
        await store.transact(ctx, async (ctx, tx) => {
            await tx.put(ctx, Uint8Array.from([1]), Uint8Array.from([42]));
        });

        const mappedTxn = new MappedTransaction(
            await store.transact(ctx, async (ctx, tx) => tx),
            keyMapper,
            valueMapper
        );

        const result = await mappedTxn.get(
            ctx,
            Buffer.from([1]).toString('base64')
        );
        expect(result).toBe(Buffer.from([42]).toString('hex'));
    });

    it('should return undefined for a missing key', async () => {
        const store = new MemKVStore();
        const mappedTxn = new MappedTransaction(
            await store.transact(ctx, async (ctx, tx) => tx),
            keyMapper,
            valueMapper
        );

        const result = await mappedTxn.get(
            ctx,
            Buffer.from([2]).toString('base64')
        );
        expect(result).toBeUndefined();
    });

    it('should query values and decode them', async () => {
        const store = new MemKVStore();
        await store.transact(ctx, async (ctx, tx) => {
            await tx.put(ctx, Uint8Array.from([2]), Uint8Array.from([100]));
            await tx.put(ctx, Uint8Array.from([3]), Uint8Array.from([200]));
        });

        const mappedTxn = new MappedTransaction(
            await store.transact(ctx, async (ctx, tx) => tx),
            keyMapper,
            valueMapper
        );

        const condition: Condition<string> = {
            gt: Buffer.from([2]).toString('base64'),
        };
        const results: Entry<string, string>[] = [];
        for await (const entry of mappedTxn.query(ctx, condition)) {
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
        const store = new MemKVStore();
        const mappedTxn = new MappedTransaction(
            await store.transact(ctx, async (ctx, tx) => tx),
            keyMapper,
            valueMapper
        );

        await mappedTxn.put(
            ctx,
            Buffer.from([4]).toString('base64'),
            Buffer.from([500]).toString('hex')
        );

        const result = await mappedTxn.get(
            ctx,
            Buffer.from([4]).toString('base64')
        );

        expect(result).toEqual(Buffer.from([500]).toString('hex'));
    });
});

describe('MappedKVStore with MemKVStore', () => {
    const keyMapper: Mapper<Uint8Array, string> = {
        encode: key => Buffer.from(key, 'base64'),
        decode: key => Buffer.from(key).toString('base64'),
    };

    const valueMapper: Mapper<Uint8Array, string> = {
        encode: value => Buffer.from(value, 'hex'),
        decode: value => Buffer.from(value).toString('hex'),
    };

    it('should execute a transaction with mapped keys and values', async () => {
        const store = new MemKVStore();
        const mappedStore = new MappedKVStore(store, keyMapper, valueMapper);

        const result = await mappedStore.transact(ctx, async (ctx, tx) => {
            await tx.put(
                ctx,
                Buffer.from([10]).toString('base64'),
                Buffer.from([1000]).toString('hex')
            );
            return await tx.get(ctx, Buffer.from([10]).toString('base64'));
        });

        expect(result).toBe(Buffer.from([1000]).toString('hex'));
    });
});
