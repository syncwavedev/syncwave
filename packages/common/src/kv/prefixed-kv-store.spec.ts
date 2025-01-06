import {describe, expect, it} from 'vitest';
import {toArrayAsync} from '../utils';
import {InMemoryKVStore} from './in-memory-kv-store';
import {Entry} from './kv-store';
import {PrefixedKVStore, PrefixedTransaction} from './prefixed-kv-store';

function encodeString(str) {
    return new TextEncoder().encode(str);
}

describe('PrefixedTransaction', () => {
    it('should get a value with the correct prefixed key', async () => {
        const store = new InMemoryKVStore();
        await store.transaction(async txn => {
            await txn.put(encodeString('key1'), encodeString('value1'));
            await txn.put(encodeString('key3'), encodeString('value3'));
        });

        await store.transaction(async txn => {
            const prefixedTxn = new PrefixedTransaction(txn, 'prefix:');
            await prefixedTxn.put(encodeString('key2'), encodeString('value2'));

            const value1 = await prefixedTxn.get(encodeString('key1'));
            const value2 = await prefixedTxn.get(encodeString('key2'));
            const gte = await toArrayAsync(prefixedTxn.query({gte: new Uint8Array()}));
            const gt = await toArrayAsync(prefixedTxn.query({gt: new Uint8Array()}));
            const lte = await toArrayAsync(prefixedTxn.query({lte: new Uint8Array(Array(100).fill(255))}));
            const lt = await toArrayAsync(prefixedTxn.query({lt: new Uint8Array(Array(100).fill(255))}));

            const all = [{key: encodeString('key2'), value: encodeString('value2')}];

            expect(value1).toBeUndefined();
            expect(value2).toEqual(encodeString('value2'));
            expect(gte).toEqual(all);
            expect(gt).toEqual(all);
            expect(lt).toEqual(all);
            expect(lte).toEqual(all);
        });
    });

    it('should put a value with the correct prefixed key', async () => {
        const store = new InMemoryKVStore();
        await store.transaction(async txn => {
            const prefixedTxn = new PrefixedTransaction(txn, 'prefix:');
            await prefixedTxn.put(encodeString('key'), encodeString('value'));
        });

        await store.transaction(async txn => {
            const value = await txn.get(encodeString('prefix:key'));
            expect(value).toEqual(encodeString('value'));
        });
    });

    it('should delete a value with the correct prefixed key', async () => {
        const store = new InMemoryKVStore();
        await store.transaction(async txn => {
            await txn.put(encodeString('prefix:key'), encodeString('value'));
        });

        await store.transaction(async txn => {
            const prefixedTxn = new PrefixedTransaction(txn, 'prefix:');
            await prefixedTxn.delete(encodeString('key'));
        });

        await store.transaction(async txn => {
            const value = await txn.get(encodeString('prefix:key'));
            expect(value).toBeUndefined();
        });
    });

    it('should query with a prefixed condition', async () => {
        const store = new InMemoryKVStore();
        await store.transaction(async txn => {
            await txn.put(encodeString('prefix:key1'), encodeString('value1'));
            await txn.put(encodeString('prefix:key2'), encodeString('value2'));
            await txn.put(encodeString('other:key3'), encodeString('value3'));
        });

        await store.transaction(async txn => {
            const prefixedTxn = new PrefixedTransaction(txn, 'prefix:');
            const results: Entry<Uint8Array, Uint8Array>[] = [];

            for await (const entry of prefixedTxn.query({gte: encodeString('key1')})) {
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
        const store = new InMemoryKVStore();
        const prefixedStore = new PrefixedKVStore(store, 'prefix:');

        await prefixedStore.transaction(async txn => {
            await txn.put(encodeString('key1'), encodeString('value1'));
            const value = await txn.get(encodeString('key1'));
            expect(value).toEqual(encodeString('value1'));
        });

        await store.transaction(async txn => {
            const value = await txn.get(encodeString('prefix:key1'));
            expect(value).toEqual(encodeString('value1'));
        });
    });

    it('should isolate transactions', async () => {
        const store = new InMemoryKVStore();
        const prefixedStore1 = new PrefixedKVStore(store, 'prefix1:');
        const prefixedStore2 = new PrefixedKVStore(store, 'prefix2:');

        await prefixedStore1.transaction(async txn => {
            await txn.put(encodeString('key'), encodeString('value1'));
        });

        await prefixedStore2.transaction(async txn => {
            const value = await txn.get(encodeString('key'));
            expect(value).toBeUndefined();
        });
    });
});
