import {describe, expect, it} from 'vitest';
import {astream} from '../async-stream.js';
import {StringCodec} from '../codec.js';
import {Entry} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';
import {PrefixedKVStore, PrefixedTransaction} from './prefixed-kv-store.js';

const stringCodec = new StringCodec();
function encodeString(str: string) {
    return stringCodec.encode(str);
}

describe('PrefixedTransaction', () => {
    it('should get a value with the correct prefixed key', async () => {
        const store = new MemKVStore();
        await store.transaction(async tx => {
            await tx.put(encodeString('key1'), encodeString('value1'));
            await tx.put(encodeString('key3'), encodeString('value3'));
        });

        await store.transaction(async tx => {
            const prefixedTxn = new PrefixedTransaction(tx, 'prefix:');
            await prefixedTxn.put(encodeString('key2'), encodeString('value2'));

            const value1 = await prefixedTxn.get(encodeString('key1'));
            const value2 = await prefixedTxn.get(encodeString('key2'));
            const gte = await astream(
                prefixedTxn.query({gte: new Uint8Array()})
            ).toArray();
            const gt = await astream(
                prefixedTxn.query({gt: new Uint8Array()})
            ).toArray();
            const lte = await astream(
                prefixedTxn.query({lte: new Uint8Array(Array(100).fill(255))})
            ).toArray();
            const lt = await astream(
                prefixedTxn.query({lt: new Uint8Array(Array(100).fill(255))})
            ).toArray();

            const all = [
                {key: encodeString('key2'), value: encodeString('value2')},
            ];

            expect(value1).toBeUndefined();
            expect(value2).toEqual(encodeString('value2'));
            expect(gte).toEqual(all);
            expect(gt).toEqual(all);
            expect(lt).toEqual(all);
            expect(lte).toEqual(all);
        });
    });

    it('should put a value with the correct prefixed key', async () => {
        const store = new MemKVStore();
        await store.transaction(async tx => {
            const prefixedTxn = new PrefixedTransaction(tx, 'prefix:');
            await prefixedTxn.put(encodeString('key'), encodeString('value'));
        });

        await store.transaction(async tx => {
            const value = await tx.get(encodeString('prefix:key'));
            expect(value).toEqual(encodeString('value'));
        });
    });

    it('should delete a value with the correct prefixed key', async () => {
        const store = new MemKVStore();
        await store.transaction(async tx => {
            await tx.put(encodeString('prefix:key'), encodeString('value'));
        });

        await store.transaction(async tx => {
            const prefixedTxn = new PrefixedTransaction(tx, 'prefix:');
            await prefixedTxn.delete(encodeString('key'));
        });

        await store.transaction(async tx => {
            const value = await tx.get(encodeString('prefix:key'));
            expect(value).toBeUndefined();
        });
    });

    it('should query with a prefixed condition', async () => {
        const store = new MemKVStore();
        await store.transaction(async tx => {
            await tx.put(encodeString('prefix:key1'), encodeString('value1'));
            await tx.put(encodeString('prefix:key2'), encodeString('value2'));
            await tx.put(encodeString('other:key3'), encodeString('value3'));
        });

        await store.transaction(async tx => {
            const prefixedTxn = new PrefixedTransaction(tx, 'prefix:');
            const results: Entry<Uint8Array, Uint8Array>[] = [];

            for await (const entry of prefixedTxn.query({
                gte: encodeString('key1'),
            })) {
                results.push(entry);
            }

            expect(results).toEqual([
                {key: encodeString('key1'), value: encodeString('value1')},
                {key: encodeString('key2'), value: encodeString('value2')},
            ]);
        });
    });
});

describe('PrefixedKVStore', () => {
    it('should execute a transaction with the correct prefix', async () => {
        const store = new MemKVStore();
        const prefixedStore = new PrefixedKVStore(store, 'prefix:');

        await prefixedStore.transaction(async tx => {
            await tx.put(encodeString('key1'), encodeString('value1'));
            const value = await tx.get(encodeString('key1'));
            expect(value).toEqual(encodeString('value1'));
        });

        await store.transaction(async tx => {
            const value = await tx.get(encodeString('prefix:key1'));
            expect(value).toEqual(encodeString('value1'));
        });
    });

    it('should isolate transactions', async () => {
        const store = new MemKVStore();
        const prefixedStore1 = new PrefixedKVStore(store, 'prefix1:');
        const prefixedStore2 = new PrefixedKVStore(store, 'prefix2:');

        await prefixedStore1.transaction(async tx => {
            await tx.put(encodeString('key'), encodeString('value1'));
        });

        await prefixedStore2.transaction(async tx => {
            const value = await tx.get(encodeString('key'));
            expect(value).toBeUndefined();
        });
    });
});
