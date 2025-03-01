import {describe, expect, it} from 'vitest';
import {encodeString} from '../codec.js';
import {toStream} from '../stream.js';
import {KvStoreIsolator, TransactionIsolator} from './kv-store-isolator.js';
import type {AppEntry} from './kv-store.js';
import {MemMvccStore} from './mem-mvcc-store.js';
import {TupleStore} from './tuple-store.js';

describe('TransactionIsolator', () => {
    it('should get a value with the correct prefixed key', async () => {
        const store = new TupleStore(new MemMvccStore());
        await store.transact(async tx => {
            await tx.put(['key1'], encodeString('value1'));
            await tx.put(['key3'], encodeString('value3'));
        });

        await store.transact(async tx => {
            const prefixedTxn = new TransactionIsolator(tx, ['prefix:']);
            await prefixedTxn.put(['key2'], encodeString('value2'));

            const value1 = await prefixedTxn.get(['key1']);
            const value2 = await prefixedTxn.get(['key2']);
            const gte = await toStream(prefixedTxn.query({gte: []})).toArray();
            const gt = await toStream(prefixedTxn.query({gt: []})).toArray();
            const lte = await toStream(
                prefixedTxn.query({
                    lte: Array(100).fill(255),
                })
            ).toArray();
            const lt = await toStream(
                prefixedTxn.query({
                    lt: Array(100).fill(255),
                })
            ).toArray();

            const all = [
                {
                    key: ['key2'],
                    value: encodeString('value2'),
                },
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
        const store = new TupleStore(new MemMvccStore());
        await store.transact(async tx => {
            const prefixedTxn = new TransactionIsolator(tx, ['pre', 'fix']);
            await prefixedTxn.put(['key'], encodeString('value'));
        });

        await store.transact(async tx => {
            const value = await tx.get(['pre', 'fix', 'key']);
            expect(value).toEqual(encodeString('value'));
        });
    });

    it('should delete a value with the correct prefixed key', async () => {
        const store = new TupleStore(new MemMvccStore());
        await store.transact(async tx => {
            await tx.put(['prefix', 'key'], encodeString('value'));
        });

        await store.transact(async tx => {
            const prefixedTxn = new TransactionIsolator(tx, ['prefix']);
            await prefixedTxn.delete(['key']);
        });

        await store.transact(async tx => {
            const value = await tx.get(['prefix', 'key']);
            expect(value).toBeUndefined();
        });
    });

    it('should query with a prefixed condition', async () => {
        const store = new TupleStore(new MemMvccStore());
        await store.transact(async tx => {
            await tx.put(['prefix', 'key1'], encodeString('value1'));
            await tx.put(['prefix', 'key2'], encodeString('value2'));
            await tx.put(['other', 'key3'], encodeString('value3'));
        });

        await store.transact(async tx => {
            const prefixedTxn = new TransactionIsolator(tx, ['prefix']);
            const results: AppEntry[] = [];

            const entry$ = prefixedTxn.query({
                gte: ['key1'],
            });
            for await (const entry of entry$) {
                results.push(entry);
            }

            expect(results).toEqual([
                {
                    key: ['key1'],
                    value: encodeString('value1'),
                },
                {
                    key: ['key2'],
                    value: encodeString('value2'),
                },
            ]);
        });
    });
});

describe('PrefixedKVStore', () => {
    it('should execute a transaction with the correct prefix', async () => {
        const store = new TupleStore(new MemMvccStore());
        const prefixedStore = new KvStoreIsolator(store, ['prefix']);

        await prefixedStore.transact(async tx => {
            await tx.put(['key1'], encodeString('value1'));
            const value = await tx.get(['key1']);
            expect(value).toEqual(encodeString('value1'));
        });

        await store.transact(async tx => {
            const value = await tx.get(['prefix', 'key1']);
            expect(value).toEqual(encodeString('value1'));
        });
    });

    it('should isolate transactions', async () => {
        const store = new TupleStore(new MemMvccStore());
        const prefixedStore1 = new KvStoreIsolator(store, ['prefix1']);
        const prefixedStore2 = new KvStoreIsolator(store, ['prefix2']);

        await prefixedStore1.transact(async tx => {
            await tx.put(['key'], encodeString('value1'));
        });

        await prefixedStore2.transact(async tx => {
            const value = await tx.get(['key']);
            expect(value).toBeUndefined();
        });
    });
});
