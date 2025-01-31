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
            await tx.put(
                cx,
                encodeString(cx, 'key1'),
                encodeString(cx, 'value1')
            );
            await tx.put(
                cx,
                encodeString(cx, 'key3'),
                encodeString(cx, 'value3')
            );
        });

        await store.transact(cx, async (cx, tx) => {
            const prefixedTxn = new PrefixedTransaction(cx, tx, 'prefix:');
            await prefixedTxn.put(
                cx,
                encodeString(cx, 'key2'),
                encodeString(cx, 'value2')
            );

            const value1 = await prefixedTxn.get(cx, encodeString(cx, 'key1'));
            const value2 = await prefixedTxn.get(cx, encodeString(cx, 'key2'));
            const gte = await astream(
                prefixedTxn.query(cx, {gte: new Uint8Array()})
            ).toArray();
            const gt = await astream(
                prefixedTxn.query(cx, {gt: new Uint8Array()})
            ).toArray();
            const lte = await astream(
                prefixedTxn.query(cx, {
                    lte: new Uint8Array(Array(100).fill(255)),
                })
            ).toArray();
            const lt = await astream(
                prefixedTxn.query(cx, {
                    lt: new Uint8Array(Array(100).fill(255)),
                })
            ).toArray();

            const all = [
                {
                    key: encodeString(cx, 'key2'),
                    value: encodeString(cx, 'value2'),
                },
            ];

            expect(value1).toBeUndefined();
            expect(value2).toEqual(encodeString(cx, 'value2'));
            expect(gte).toEqual(all);
            expect(gt).toEqual(all);
            expect(lt).toEqual(all);
            expect(lte).toEqual(all);
        });
    });

    it('should put a value with the correct prefixed key', async () => {
        const store = new MemKVStore();
        await store.transact(cx, async (cx, tx) => {
            const prefixedTxn = new PrefixedTransaction(cx, tx, 'prefix:');
            await prefixedTxn.put(
                cx,
                encodeString(cx, 'key'),
                encodeString(cx, 'value')
            );
        });

        await store.transact(cx, async (cx, tx) => {
            const value = await tx.get(cx, encodeString(cx, 'prefix:key'));
            expect(value).toEqual(encodeString(cx, 'value'));
        });
    });

    it('should delete a value with the correct prefixed key', async () => {
        const store = new MemKVStore();
        await store.transact(cx, async (cx, tx) => {
            await tx.put(
                cx,
                encodeString(cx, 'prefix:key'),
                encodeString(cx, 'value')
            );
        });

        await store.transact(cx, async (cx, tx) => {
            const prefixedTxn = new PrefixedTransaction(cx, tx, 'prefix:');
            await prefixedTxn.delete(cx, encodeString(cx, 'key'));
        });

        await store.transact(cx, async (cx, tx) => {
            const value = await tx.get(cx, encodeString(cx, 'prefix:key'));
            expect(value).toBeUndefined();
        });
    });

    it('should query with a prefixed condition', async () => {
        const store = new MemKVStore();
        await store.transact(cx, async (cx, tx) => {
            await tx.put(
                cx,
                encodeString(cx, 'prefix:key1'),
                encodeString(cx, 'value1')
            );
            await tx.put(
                cx,
                encodeString(cx, 'prefix:key2'),
                encodeString(cx, 'value2')
            );
            await tx.put(
                cx,
                encodeString(cx, 'other:key3'),
                encodeString(cx, 'value3')
            );
        });

        await store.transact(cx, async (cx, tx) => {
            const prefixedTxn = new PrefixedTransaction(cx, tx, 'prefix:');
            const results: Entry<Uint8Array, Uint8Array>[] = [];

            const entry$ = prefixedTxn.query(cx, {
                gte: encodeString(cx, 'key1'),
            });
            for await (const [cx, entry] of entry$) {
                results.push(entry);
            }

            expect(results).toEqual([
                {
                    key: encodeString(cx, 'key1'),
                    value: encodeString(cx, 'value1'),
                },
                {
                    key: encodeString(cx, 'key2'),
                    value: encodeString(cx, 'value2'),
                },
            ]);
        });
    });
});

describe('PrefixedKVStore', () => {
    it('should execute a transaction with the correct prefix', async () => {
        const store = new MemKVStore();
        const prefixedStore = new PrefixedKVStore(cx, store, 'prefix:');

        await prefixedStore.transact(cx, async (cx, tx) => {
            await tx.put(
                cx,
                encodeString(cx, 'key1'),
                encodeString(cx, 'value1')
            );
            const value = await tx.get(cx, encodeString(cx, 'key1'));
            expect(value).toEqual(encodeString(cx, 'value1'));
        });

        await store.transact(cx, async (cx, tx) => {
            const value = await tx.get(cx, encodeString(cx, 'prefix:key1'));
            expect(value).toEqual(encodeString(cx, 'value1'));
        });
    });

    it('should isolate transactions', async () => {
        const store = new MemKVStore();
        const prefixedStore1 = new PrefixedKVStore(cx, store, 'prefix1:');
        const prefixedStore2 = new PrefixedKVStore(cx, store, 'prefix2:');

        await prefixedStore1.transact(cx, async (cx, tx) => {
            await tx.put(
                cx,
                encodeString(cx, 'key'),
                encodeString(cx, 'value1')
            );
        });

        await prefixedStore2.transact(cx, async (cx, tx) => {
            const value = await tx.get(cx, encodeString(cx, 'key'));
            expect(value).toBeUndefined();
        });
    });
});
