import {describe, expect, it} from 'vitest';
import {astream} from '../async-stream.js';
import {encodeString} from '../codec.js';
import {Cx} from '../context.js';
import {Entry} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';
import {PrefixedKVStore, PrefixedTransaction} from './prefixed-kv-store.js';

const cx = Cx.test();

describe('PrefixedTransaction', () => {
    it('should get a value with the correct prefixed key', async () => {
        const store = new MemKVStore();
        await store.transact(cx, async (cx, tx) => {
            await tx.put(cx, encodeString('key1'), encodeString('value1'));
            await tx.put(cx, encodeString('key3'), encodeString('value3'));
        });

        await store.transact(cx, async (cx, tx) => {
            const prefixedTxn = new PrefixedTransaction(tx, 'prefix:');
            await prefixedTxn.put(
                cx,
                encodeString('key2'),
                encodeString('value2')
            );

            const value1 = await prefixedTxn.get(cx, encodeString('key1'));
            const value2 = await prefixedTxn.get(cx, encodeString('key2'));
            const gte = await astream(
                prefixedTxn.query(cx, {gte: new Uint8Array()})
            ).toArray(cx);
            const gt = await astream(
                prefixedTxn.query(cx, {gt: new Uint8Array()})
            ).toArray(cx);
            const lte = await astream(
                prefixedTxn.query(cx, {
                    lte: new Uint8Array(Array(100).fill(255)),
                })
            ).toArray(cx);
            const lt = await astream(
                prefixedTxn.query(cx, {
                    lt: new Uint8Array(Array(100).fill(255)),
                })
            ).toArray(cx);

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
        await store.transact(cx, async (cx, tx) => {
            const prefixedTxn = new PrefixedTransaction(tx, 'prefix:');
            await prefixedTxn.put(
                cx,
                encodeString('key'),
                encodeString('value')
            );
        });

        await store.transact(cx, async (cx, tx) => {
            const value = await tx.get(cx, encodeString('prefix:key'));
            expect(value).toEqual(encodeString('value'));
        });
    });

    it('should delete a value with the correct prefixed key', async () => {
        const store = new MemKVStore();
        await store.transact(cx, async (cx, tx) => {
            await tx.put(cx, encodeString('prefix:key'), encodeString('value'));
        });

        await store.transact(cx, async (cx, tx) => {
            const prefixedTxn = new PrefixedTransaction(tx, 'prefix:');
            await prefixedTxn.delete(cx, encodeString('key'));
        });

        await store.transact(cx, async (cx, tx) => {
            const value = await tx.get(cx, encodeString('prefix:key'));
            expect(value).toBeUndefined();
        });
    });

    it('should query with a prefixed condition', async () => {
        const store = new MemKVStore();
        await store.transact(cx, async (cx, tx) => {
            await tx.put(
                cx,
                encodeString('prefix:key1'),
                encodeString('value1')
            );
            await tx.put(
                cx,
                encodeString('prefix:key2'),
                encodeString('value2')
            );
            await tx.put(
                cx,
                encodeString('other:key3'),
                encodeString('value3')
            );
        });

        await store.transact(cx, async (cx, tx) => {
            const prefixedTxn = new PrefixedTransaction(tx, 'prefix:');
            const results: Entry<Uint8Array, Uint8Array>[] = [];

            for await (const entry of prefixedTxn.query(cx, {
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

        await prefixedStore.transact(cx, async (cx, tx) => {
            await tx.put(cx, encodeString('key1'), encodeString('value1'));
            const value = await tx.get(cx, encodeString('key1'));
            expect(value).toEqual(encodeString('value1'));
        });

        await store.transact(cx, async (cx, tx) => {
            const value = await tx.get(cx, encodeString('prefix:key1'));
            expect(value).toEqual(encodeString('value1'));
        });
    });

    it('should isolate transactions', async () => {
        const store = new MemKVStore();
        const prefixedStore1 = new PrefixedKVStore(store, 'prefix1:');
        const prefixedStore2 = new PrefixedKVStore(store, 'prefix2:');

        await prefixedStore1.transact(cx, async (cx, tx) => {
            await tx.put(cx, encodeString('key'), encodeString('value1'));
        });

        await prefixedStore2.transact(cx, async (cx, tx) => {
            const value = await tx.get(cx, encodeString('key'));
            expect(value).toBeUndefined();
        });
    });
});
