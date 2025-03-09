import {beforeEach, describe, expect, it, vi} from 'vitest';
import {MsgpackCodec} from '../codec.js';
import {Deferred} from '../deferred.js';
import {AggregateError, AppError} from '../errors.js';
import {toStream} from '../stream.js';
import {decodeTuple, encodeTuple} from '../tuple.js';
import {whenAll} from '../utils.js';
import {KvStoreMapper} from './kv-store-mapper.js';
import type {Condition, KvStore, Uint8KvStore} from './kv-store.js';
import {MvccConflictError} from './mem-mvcc-store.js';
import {TxController} from './tx-controller.js';

// todo: extract KvStore testsuite (without conflicts)

export function describeMvccStore(
    name: string,
    createMvccStore: (options: {conflictRetryCount: number}) => Uint8KvStore
) {
    describe(name, () => {
        let store: KvStore<number, string>;
        let rawMvccStore: Uint8KvStore;

        function mapStore<T>(rawStore: Uint8KvStore): KvStore<number, T> {
            return new KvStoreMapper(
                rawStore,
                {
                    decode: x => decodeTuple(x)[0] as number,
                    encode: x => encodeTuple([x]),
                },
                new MsgpackCodec()
            );
        }

        beforeEach(() => {
            rawMvccStore = createMvccStore({conflictRetryCount: 0});
            store = mapStore(rawMvccStore);
        });

        it('should delete concurrent transaction entry without a conflict', async () => {
            const t1Started = new Deferred<void>();
            const t2Started = new Deferred<void>();
            const t1Done = new Deferred<void>();

            const t1 = store.transact(async tx => {
                t1Started.resolve();
                await t2Started.promise;
                await tx.delete(0);
                await tx.put(1, 'zero');
                t1Done.resolve();
            });

            const t2 = store.transact(async tx => {
                t2Started.resolve();
                await t1Started.promise;
                await tx.delete(1);
                await t1Done.promise;
            });

            await t1;
            // t2 commits after t1, so it will delete key 1 without a conflict
            // because it didn't read anything
            await t2;

            await store.snapshot(async tx => {
                const result = await toStream(tx.query({lte: 4}))
                    .take(3)
                    .toArray();

                expect(result).toEqual([]);
            });
        });

        it('should query (case: delete before entry after commit)', async () => {
            await store.transact(async tx => {
                await tx.put(1, '80');
            });

            await store.transact(async tx => {
                await tx.delete(0);
            });

            await store.transact(async tx => {
                const entries = await toStream(tx.query({gte: 1})).toArray();

                expect(entries).toEqual([{key: 1, value: '80'}]);
            });
        });

        it('should remove entry in write set (case: query)', async () => {
            await store.transact(async tx => {
                await tx.put(1, 'one');
                await tx.delete(1);

                const values = await toStream(tx.query({gte: 0})).toArray();
                expect(values).toEqual([]);
            });
        });

        it('should remove entry in write set (case: get)', async () => {
            await store.transact(async tx => {
                await tx.put(1, 'one');
                await tx.delete(1);

                const value = await tx.get(1);
                expect(value).toEqual(undefined);
            });
        });

        it('should delete key multiple times', async () => {
            await store.transact(async tx => {
                let value = await tx.get(1);
                expect(value).toBe(undefined);
                await tx.put(1, 'one');
                value = await tx.get(1);
                expect(value).toBe('one');
            });

            await store.transact(async tx => {
                let value = await tx.get(1);
                expect(value).toBe('one');
                await tx.delete(1);
                value = await tx.get(1);
                expect(value).toBe(undefined);
                await tx.delete(1);
                value = await tx.get(1);
                expect(value).toBe(undefined);
            });

            await store.transact(async tx => {
                let value = await tx.get(1);
                expect(value).toBe(undefined);
                await tx.delete(1);
                value = await tx.get(1);
                expect(value).toBe(undefined);
            });

            await store.transact(async tx => {
                let value = await tx.get(1);
                expect(value).toBe(undefined);
                await tx.put(1, 'one');
                value = await tx.get(1);
                expect(value).toBe('one');
            });
        });

        it('should store keys', async () => {
            await store.transact(async tx => {
                await tx.put(1, 'one');
                await tx.put(2, 'two');
            });

            await store.transact(async tx => {
                const value1 = await tx.get(1);
                const value2 = await tx.get(2);

                expect(value1).toBe('one');
                expect(value2).toBe('two');
            });
        });

        it('should delete in write set', async () => {
            await store.transact(async tx => {
                await tx.put(1, 'one');
                await tx.put(2, 'two');
                await tx.put(3, 'three');

                await tx.delete(2);
            });

            await store.transact(async tx => {
                const result = await toStream(tx.query({gte: 0})).toArray();

                expect(result).toEqual([
                    {key: 1, value: 'one'},
                    {key: 3, value: 'three'},
                ]);
            });
        });

        it('should delete', async () => {
            await store.transact(async tx => {
                await tx.put(1, 'one');
                await tx.put(2, 'two');
                await tx.put(3, 'three');
            });

            await store.transact(async tx => {
                await tx.delete(2);
            });

            await store.transact(async tx => {
                const result = await toStream(tx.query({gte: 0})).toArray();

                expect(result).toEqual([
                    {key: 1, value: 'one'},
                    {key: 3, value: 'three'},
                ]);
            });
        });

        it('should delete v2', async () => {
            await store.transact(async tx => {
                await tx.put(1, 'one');
                await tx.put(2, 'two');
                await tx.put(3, 'three');
            });

            await store.transact(async tx => {
                expect(await tx.get(2)).toEqual('two');
                await tx.delete(2);
                expect(await tx.get(2)).toBeUndefined();
            });

            await store.snapshot(async tx => {
                expect(await tx.get(2)).toBeUndefined();
            });

            await store.transact(async tx => {
                const result = await toStream(tx.query({gte: 0})).toArray();

                expect(result).toEqual([
                    {key: 1, value: 'one'},
                    {key: 3, value: 'three'},
                ]);
            });
        });

        it('should update existing keys', async () => {
            await store.transact(async tx => {
                await tx.put(1, 'one');
                await tx.put(2, 'two');
            });

            await store.transact(async tx => {
                await tx.put(2, 'four');
                await tx.put(3, 'five');
            });

            await store.transact(async tx => {
                const value1 = await tx.get(1);
                const value2 = await tx.get(2);
                const value3 = await tx.get(3);

                expect(value1).toBe('one');
                expect(value2).toBe('four');
                expect(value3).toBe('five');
            });
        });

        describe('should query without write set', () => {
            // gt

            it('should query keys (case: > 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gt: 0})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: > 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gt: 1})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: > 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gt: 2})).toArray();
                    expect(values).toEqual([{key: 3, value: 'three'}]);
                });
            });

            it('should query keys (case: > 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gt: 3})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: > 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gt: 4})).toArray();
                    expect(values).toEqual([]);
                });
            });

            // gte

            it('should query keys (case: >= 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gte: 0})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gte: 1})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gte: 2})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gte: 3})).toArray();
                    expect(values).toEqual([{key: 3, value: 'three'}]);
                });
            });

            it('should query keys (case: >= 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({gte: 4})).toArray();
                    expect(values).toEqual([]);
                });
            });

            // lt

            it('should query keys (case: < 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lt: 0})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: < 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lt: 1})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: < 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lt: 2})).toArray();
                    expect(values).toEqual([{key: 1, value: 'one'}]);
                });
            });

            it('should query keys (case: < 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lt: 3})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: < 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lt: 4})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            // lte

            it('should query keys (case: <= 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lte: 0})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: <= 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lte: 1})).toArray();
                    expect(values).toEqual([{key: 1, value: 'one'}]);
                });
            });

            it('should query keys (case: <= 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lte: 2})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: <= 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lte: 3})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: <= 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lte: 4})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });
        });

        describe('should query without snapshot', () => {
            // gt

            it('should query keys (case: > 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gt: 0})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: > 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gt: 1})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: > 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gt: 2})).toArray();
                    expect(values).toEqual([{key: 3, value: 'three'}]);
                });
            });

            it('should query keys (case: > 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gt: 3})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: > 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gt: 4})).toArray();
                    expect(values).toEqual([]);
                });
            });

            // gte

            it('should query keys (case: >= 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gte: 0})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gte: 1})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gte: 2})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gte: 3})).toArray();
                    expect(values).toEqual([{key: 3, value: 'three'}]);
                });
            });

            it('should query keys (case: >= 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({gte: 4})).toArray();
                    expect(values).toEqual([]);
                });
            });

            // lt

            it('should query keys (case: < 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({lt: 0})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: < 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({lt: 1})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: < 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({lt: 2})).toArray();
                    expect(values).toEqual([{key: 1, value: 'one'}]);
                });
            });

            it('should query keys (case: < 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lt: 3})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: < 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                });

                await store.transact(async tx => {
                    const values = await toStream(tx.query({lt: 4})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            // lte

            it('should query keys (case: <= 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({lte: 0})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: <= 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({lte: 1})).toArray();
                    expect(values).toEqual([{key: 1, value: 'one'}]);
                });
            });

            it('should query keys (case: <= 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({lte: 2})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: <= 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({lte: 3})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: <= 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(2, 'two');
                    await tx.put(3, 'three');
                    const values = await toStream(tx.query({lte: 4})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });
        });

        describe('should query both write set and snapshot', () => {
            // gt

            it('should query keys (case: > 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gt: 0})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: > 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gt: 1})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: > 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gt: 2})).toArray();
                    expect(values).toEqual([{key: 3, value: 'three'}]);
                });
            });

            it('should query keys (case: > 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gt: 3})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: > 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gt: 4})).toArray();
                    expect(values).toEqual([]);
                });
            });

            // gte

            it('should query keys (case: >= 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gte: 0})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gte: 1})).toArray();
                    expect(values).toEqual([
                        {key: 1, value: 'one'},
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gte: 2})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 3, value: 'three'},
                    ]);
                });
            });

            it('should query keys (case: >= 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gte: 3})).toArray();
                    expect(values).toEqual([{key: 3, value: 'three'}]);
                });
            });

            it('should query keys (case: >= 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({gte: 4})).toArray();
                    expect(values).toEqual([]);
                });
            });

            // lt

            it('should query keys (case: < 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lt: 0})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: < 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lt: 1})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: < 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lt: 2})).toArray();
                    expect(values).toEqual([{key: 1, value: 'one'}]);
                });
            });

            it('should query keys (case: < 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lt: 3})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: < 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lt: 4})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            // lte

            it('should query keys (case: <= 0)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lte: 0})).toArray();
                    expect(values).toEqual([]);
                });
            });

            it('should query keys (case: <= 1)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lte: 1})).toArray();
                    expect(values).toEqual([{key: 1, value: 'one'}]);
                });
            });

            it('should query keys (case: <= 2)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lte: 2})).toArray();
                    expect(values).toEqual([
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: <= 3)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lte: 3})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });

            it('should query keys (case: <= 4)', async () => {
                await store.transact(async tx => {
                    await tx.put(1, 'place_me');
                    await tx.put(2, 'two');
                });

                await store.transact(async tx => {
                    await tx.put(1, 'one');
                    await tx.put(3, 'three');

                    const values = await toStream(tx.query({lte: 4})).toArray();
                    expect(values).toEqual([
                        {key: 3, value: 'three'},
                        {key: 2, value: 'two'},
                        {key: 1, value: 'one'},
                    ]);
                });
            });
        });

        describe('conflicts', () => {
            it('should add with conflicts', async () => {
                let expected = 0;
                const transactionRetryCount = 10;
                const store2 = mapStore<number>(
                    createMvccStore({conflictRetryCount: transactionRetryCount})
                );
                await whenAll(
                    Array(transactionRetryCount)
                        .fill(undefined)
                        .map(async (_, i) => {
                            expected += i;

                            await store2.transact(async tx => {
                                const value = await tx.get(1);
                                await tx.put(1, (value ?? 0) + i);
                            });
                        })
                );

                await store2.transact(async tx => {
                    const result = await tx.get(1);
                    expect(result).toBe(expected);
                });
            });

            it('should throw conflict if not enough retries', async () => {
                const transactionRetryCount = 10;
                const store = mapStore<number>(
                    createMvccStore({conflictRetryCount: transactionRetryCount})
                );
                const promise = whenAll(
                    Array(transactionRetryCount * 2)
                        .fill(undefined)
                        .map(async (_, i) => {
                            await store.transact(async tx => {
                                const value = await tx.get(1);
                                await tx.put(1, (value ?? 0) + i);
                            });
                        })
                );

                await expect(promise).rejects.toThrow(AggregateError);
            });

            interface ConflictTestcase {
                name: string;
                result: 'resolves' | 'rejects';
                only?: true;
                case: (
                    t1: TxController<number, string>,
                    t2: TxController<number, string>
                ) => Promise<void>;
            }

            const conditions: Array<Condition<number>> = Array(6)
                .fill(0)
                .map((_, idx) => idx - 1)
                .flatMap(x => [{gt: x}, {gte: x}, {lt: x}, {lte: x}]);

            const testcases: ConflictTestcase[] = [
                {
                    name: 'should conflict on concurrent write transactions (case: put + get,put)',
                    result: 'rejects',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(1, 'one');
                        await t2.get(1);
                        await t2.put(2, 'two');
                        // write before read
                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should not conflict on concurrent write transactions (case: put + get,put)',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(1, 'one');
                        await t2.get(1);
                        await t2.put(2, 'two');
                        // write after read
                        t2.done();
                        t1.done();
                    },
                },
                {
                    name: 'should not conflict if readonly (case: get)',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(1, 'one');
                        await t2.get(1);
                        t1.done();
                        t2.done();
                    },
                },
                ...conditions.map(
                    (condition): ConflictTestcase => ({
                        name: `should not conflict if readonly (case: ${JSON.stringify(condition)})`,
                        result: 'resolves',
                        case: async (t1, t2) => {
                            await t1.accept();
                            await t2.accept();
                            await t1.put(2, 'conflict');
                            await t1.put(-10, 'conflict');
                            await t1.put(10, 'conflict');
                            await toStream(t2.query(condition)).toArray();
                            t1.done();
                            t2.done();
                        },
                    })
                ),
                ...conditions
                    .filter(x => x.gt !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should not conflict (case: ${JSON.stringify(condition)})`,
                            result: 'resolves',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.gt, 'conflict');
                                await t2.put(123, 'new');
                                await toStream(t2.query(condition)).first();
                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                // gt
                ...conditions
                    .filter(x => x.gt !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should conflict (case: query ${JSON.stringify(condition)} + put ${condition.gt + 1})`,
                            result: 'rejects',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.gt + 1, 'conflict');
                                await t2.put(-123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                ...conditions
                    .filter(x => x.gt !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should not conflict (case: query ${JSON.stringify(condition)} + put ${condition.gt})`,
                            result: 'resolves',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.gt, 'conflict');
                                await t2.put(-123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                // gte
                ...conditions
                    .filter(x => x.gte !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should conflict (case: query ${JSON.stringify(condition)} + put 100)`,
                            result: 'rejects',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(100, 'conflict');
                                await t2.put(-123, 'new');
                                await toStream(t2.query(condition)).toArray();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                ...conditions
                    .filter(x => x.gte !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should conflict (case: query ${JSON.stringify(condition)} + put ${condition.gte})`,
                            result: 'rejects',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.gte, 'conflict');
                                await t2.put(-123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                ...conditions
                    .filter(x => x.gte !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should not conflict (case: query ${JSON.stringify(condition)} + put ${condition.gte - 1})`,
                            result: 'resolves',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.gte - 1, 'conflict');
                                await t2.put(-123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                ...conditions
                    .filter(x => x.gte !== undefined && x.gte <= 3)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should not conflict (case: query ${JSON.stringify(condition)} + put 100)`,
                            result: 'resolves',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(100, 'conflict');
                                await t2.put(-123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                // lt
                ...conditions
                    .filter(x => x.lt !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should conflict (case: query ${JSON.stringify(condition)} + put ${condition.lt - 1})`,
                            result: 'rejects',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.lt - 1, 'conflict');
                                await t2.put(123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                ...conditions
                    .filter(x => x.lt !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should not conflict (case: query ${JSON.stringify(condition)} + put ${condition.lt})`,
                            result: 'resolves',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.lt, 'conflict');
                                await t2.put(123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                // lte
                ...conditions
                    .filter(x => x.lte !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should conflict (case: query all ${JSON.stringify(condition)} + put -100)`,
                            result: 'rejects',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(-123, 'conflict');
                                await t2.put(123, 'new');
                                await toStream(t2.query(condition)).toArray();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                ...conditions
                    .filter(x => x.lte !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should conflict (case: query first ${JSON.stringify(condition)} + put ${condition.lte})`,
                            result: 'rejects',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.lte, 'conflict');
                                await t2.put(123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                ...conditions
                    .filter(x => x.lte !== undefined)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should not conflict (case: query first ${JSON.stringify(condition)} + put ${condition.lte + 1})`,
                            result: 'resolves',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(condition.lte + 1, 'conflict');
                                await t2.put(123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                ...conditions
                    .filter(x => x.lte !== undefined && x.lte >= 1)
                    .map(
                        (condition): ConflictTestcase => ({
                            name: `should not conflict (case: query first ${JSON.stringify(condition)} + put -100)`,
                            result: 'resolves',
                            case: async (t1, t2) => {
                                await t1.accept();
                                await t2.accept();
                                await t1.put(-100, 'conflict');
                                await t2.put(123, 'new');
                                await toStream(
                                    t2.query(condition)
                                ).firstOrDefault();

                                t1.done();
                                t2.done();
                            },
                        })
                    ),
                {
                    name: `should conflict (case: query first ${JSON.stringify({lte: 0})} + put -100)`,
                    result: 'rejects',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(-100, 'conflict');
                        await t2.put(123, 'new');
                        await toStream(t2.query({lte: 0})).firstOrDefault();

                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should not conflict for writeonly (case: put + put)',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(1, 'conflict');
                        await t2.put(1, 'new');
                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should not conflict for writeonly (case: put + delete)',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(1, 'conflict');
                        await t2.delete(1);
                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should not conflict for writeonly (case: delete + put)',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.delete(1);
                        await t2.put(1, 'new');
                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should not conflict for writeonly (case: delete + delete)',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.delete(1);
                        await t2.delete(1);
                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should resolve when get occurs on a key not written by concurrent transaction',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(20, 't1-update');
                        await t2.get(30);
                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should resolve on put then get on same key in the same transaction',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t2.put(40, 't2-new');
                        await t2.get(40);
                        await t1.put(40, 't1-update');
                        t2.done();
                        t1.done();
                    },
                },
                {
                    name: 'should resolve when both transactions write to different keys with no overlapping reads',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(80, 't1-update');
                        await t2.put(81, 't2-update');
                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should resolve when transaction writes then reads its own key even if concurrent transaction writes same key',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.put(90, 't1-value');
                        await t1.get(90);
                        await t2.put(90, 't2-value');
                        t1.done();
                        t2.done();
                    },
                },
                {
                    name: 'should resolve when both transactions only perform reads',
                    result: 'resolves',
                    case: async (t1, t2) => {
                        await t1.accept();
                        await t2.accept();
                        await t1.get(1);
                        await t2.get(2);
                        t1.done();
                        t2.done();
                    },
                },
            ];

            testcases.forEach(({name, only, result, case: actions}) => {
                // eslint-disable-next-line no-restricted-properties
                (only ? it.only : it)(name, async () => {
                    const t1 = new TxController<number, string>();
                    const t2 = new TxController<number, string>();

                    await store.transact(async tx => {
                        await tx.put(1, 'one');
                        await tx.put(2, 'two');
                        await tx.put(3, 'three');
                    });

                    const promise = whenAll([
                        store.transact(async tx => {
                            await t1.use(tx);
                            await t1.result();
                        }),
                        store.transact(async tx => {
                            await t2.use(tx);
                            await t2.result();
                        }),
                    ]);

                    await actions(t1, t2);

                    if (result === 'resolves') {
                        await promise;
                    } else {
                        await expect(promise).rejects.toThrow(
                            MvccConflictError
                        );
                    }
                });
            });
        });

        it('should execute a transaction and persist changes', async () => {
            const key = 321;
            const value = 'value1';

            await store.transact(async tx => {
                await tx.put(key, value);
            });

            await store.transact(async tx => {
                const result = await tx.get(key);
                expect(result).toEqual(value);
            });
        });

        it('should handle concurrent transactions sequentially', async () => {
            const key = 123;
            const value1 = 'value1';
            const value2 = 'value2';

            const txn1 = store.transact(async tx => {
                await tx.put(key, value1);
            });

            const txn2 = store.transact(async tx => {
                await tx.put(key, value2);
            });

            await whenAll([txn1, txn2]);

            await store.transact(async tx => {
                const result = await tx.get(key);
                expect(result).toEqual(value2); // Last transaction wins
            });
        });

        it('should not retry on transaction failure', async () => {
            const store = mapStore<number>(
                createMvccStore({conflictRetryCount: 2})
            );

            let attempt = 0;

            const txPromise = store.transact(async () => {
                if (attempt++ < 1) {
                    throw new AppError('Simulated failure');
                }
            });

            await expect(txPromise).rejects.toThrow('Simulated failure');
            expect(attempt).toBe(1);
        });

        it('should fail after exceeding retry attempts', async () => {
            vi.spyOn(store, 'transact').mockImplementationOnce(async () => {
                throw new AppError('Simulated permanent failure');
            });

            await expect(store.transact(async () => {})).rejects.toThrow(
                'Simulated permanent failure'
            );
        });

        it('should handle transaction rollback on failure', async () => {
            const key = 1;
            const value = 'value1';

            await store
                .transact(async tx => {
                    await tx.put(key, value);
                    throw new AppError('Simulated rollback');
                })
                .catch(() => {});

            await store.transact(async tx => {
                const result = await tx.get(key);
                expect(result).toBeUndefined();
            });
        });
    });
}
