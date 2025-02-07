import {
    Condition,
    GtCondition,
    GteCondition,
    LtCondition,
    LteCondition,
    toStream,
    Uint8KVStore,
} from 'syncwave-data';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

export function describeKVStore<T extends Uint8KVStore>(
    name: string,
    createStore: () => T,
    cleanup: (store: T) => Promise<void>
) {
    describe(name, () => {
        let store: T;

        beforeEach(() => {
            store = createStore();
        });

        afterEach(async () => {
            await cleanup(store);
            store.close();
        });

        it('should return undefined for a missing key', async () => {
            const result = await store.transact(async tx => {
                return tx.get(new Uint8Array([0xaa, 0xbb]));
            });
            expect(result).toBeUndefined();
        });

        it('should put and get a key', async () => {
            const key = new Uint8Array([0x01]);
            const value = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

            await store.transact(async tx => {
                await tx.put(key, value);
            });

            const fetchedValue = await store.transact(async tx => {
                return tx.get(key);
            });
            expect(fetchedValue).toEqual(value);
        });

        it('should delete a key', async () => {
            const keyToDelete = new Uint8Array([0x02]);
            const value = new Uint8Array([0x11, 0x22]);

            await store.transact(async tx => {
                await tx.put(keyToDelete, value);
            });

            await store.transact(async tx => {
                await tx.delete(keyToDelete);
            });

            const resultAfterDelete = await store.transact(async tx => {
                return tx.get(keyToDelete);
            });
            expect(resultAfterDelete).toBeUndefined();
        });

        it('should handle multiple operations in one transaction', async () => {
            const keyA = new Uint8Array([0x03]);
            const keyB = new Uint8Array([0x04]);
            const valA = new Uint8Array([0xa1]);
            const valB = new Uint8Array([0xb2]);

            await store.transact(async tx => {
                await tx.put(keyA, valA);
                await tx.put(keyB, valB);
            });

            const [gotA, gotB] = await store.transact(async tx => {
                const gA = await tx.get(keyA);
                const gB = await tx.get(keyB);
                return [gA, gB];
            });

            expect(gotA).toEqual(valA);
            expect(gotB).toEqual(valB);
        });

        it('should rollback changes if an error is thrown in the transaction', async () => {
            const keyRollback = new Uint8Array([0x05]);
            const valRollback = new Uint8Array([0xcc]);

            try {
                await store.transact(async tx => {
                    await tx.put(keyRollback, valRollback);

                    // Force an error to simulate rollback
                    throw new Error('Simulated error for rollback test');
                });
            } catch (err) {
                // ignore
            }

            // If properly rolled back, the key should not exist:
            const result = await store.transact(async tx => {
                return tx.get(keyRollback);
            });
            expect(result).toBeUndefined();
        });

        describe('query() with conditions', () => {
            const keysAndValues: Array<[Uint8Array, Uint8Array]> = [
                [new Uint8Array([0x10]), new Uint8Array([0x10])],
                [new Uint8Array([0x11]), new Uint8Array([0x11])],
                [new Uint8Array([0x12]), new Uint8Array([0x12])],
                [new Uint8Array([0x13]), new Uint8Array([0x13])],
            ];

            beforeEach(async () => {
                await store.transact(async tx => {
                    for (const [k, v] of keysAndValues) {
                        await tx.put(k, v);
                    }
                });
            });

            it('should query keys with GtCondition', async () => {
                // Condition: key > 0x11
                const condition: Condition<Uint8Array> = {
                    gt: new Uint8Array([0x11]) as GtCondition<Uint8Array>['gt'],
                };

                const results = await store.transact(tx =>
                    toStream(tx.query(condition)).toArray()
                );

                expect(results.map(r => Array.from(r.key))).toEqual([
                    [0x12],
                    [0x13],
                ]);
            });

            it('should query keys with GteCondition', async () => {
                // Condition: key >= 0x11
                const condition: Condition<Uint8Array> = {
                    gte: new Uint8Array([
                        0x11,
                    ]) as GteCondition<Uint8Array>['gte'],
                };

                const results: Array<{key: Uint8Array; value: Uint8Array}> = [];
                await store.transact(async tx => {
                    const kv$ = tx.query(condition);
                    for await (const kv of kv$) {
                        results.push(kv);
                    }
                });

                expect(results.map(r => Array.from(r.key))).toEqual([
                    [0x11],
                    [0x12],
                    [0x13],
                ]);
            });

            it('should query keys with LtCondition', async () => {
                // Condition: key < 0x12
                const condition: Condition<Uint8Array> = {
                    lt: new Uint8Array([0x12]) as LtCondition<Uint8Array>['lt'],
                };

                const results: Array<{key: Uint8Array; value: Uint8Array}> = [];
                await store.transact(async tx => {
                    const kv$ = tx.query(condition);
                    for await (const kv of kv$) {
                        results.push(kv);
                    }
                });

                expect(results.map(r => Array.from(r.key))).toEqual([
                    [0x11],
                    [0x10],
                ]);
            });

            it('should query keys with LteCondition', async () => {
                // Condition: key <= 0x12
                const condition: Condition<Uint8Array> = {
                    lte: new Uint8Array([
                        0x12,
                    ]) as LteCondition<Uint8Array>['lte'],
                };

                const results: Array<{key: Uint8Array; value: Uint8Array}> = [];
                await store.transact(async tx => {
                    const kv$ = tx.query(condition);
                    for await (const kv of kv$) {
                        results.push(kv);
                    }
                });

                expect(results.map(r => Array.from(r.key))).toEqual([
                    [0x12],
                    [0x11],
                    [0x10],
                ]);
            });
        });
    });
}
