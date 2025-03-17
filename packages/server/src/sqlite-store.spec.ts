import {rm} from 'fs/promises';
import {
    AppError,
    type Condition,
    type GtCondition,
    type GteCondition,
    type LtCondition,
    type LteCondition,
    toStream,
} from 'syncwave-data';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {SqliteRwStore} from './sqlite-store.js';

describe('SqliteUint8KVStore (localhost:4500)', () => {
    let store: SqliteRwStore;

    beforeEach(() => {
        store = new SqliteRwStore({
            dbFilePath: './test.sqlite',
            concurrentReadLimit: 4,
        });
    });

    afterEach(async () => {
        await store.close('test finished');
        await rm('./test.sqlite');
    });

    it('should return undefined for a missing key', async () => {
        const result = await store.transact(async txn => {
            return txn.get(new Uint8Array([0xaa, 0xbb]));
        });
        expect(result).toBeUndefined();
    });

    it('should put and get a key', async () => {
        const key = new Uint8Array([0x01]);
        const value = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

        await store.transact(async txn => {
            await txn.put(key, value);
        });

        const fetchedValue = await store.transact(async txn => {
            return txn.get(key);
        });
        expect(fetchedValue).toEqual(value);
    });

    it('should delete a key', async () => {
        const keyToDelete = new Uint8Array([0x02]);
        const value = new Uint8Array([0x11, 0x22]);

        await store.transact(async txn => {
            await txn.put(keyToDelete, value);
        });

        await store.transact(async txn => {
            await txn.delete(keyToDelete);
        });

        const resultAfterDelete = await store.transact(async txn => {
            return txn.get(keyToDelete);
        });
        expect(resultAfterDelete).toBeUndefined();
    });

    it('should handle multiple operations in one transaction', async () => {
        const keyA = new Uint8Array([0x03]);
        const keyB = new Uint8Array([0x04]);
        const valA = new Uint8Array([0xa1]);
        const valB = new Uint8Array([0xb2]);

        await store.transact(async txn => {
            await txn.put(keyA, valA);
            await txn.put(keyB, valB);
        });

        const [gotA, gotB] = await store.transact(async txn => {
            const gA = await txn.get(keyA);
            const gB = await txn.get(keyB);
            return [gA, gB];
        });

        expect(gotA).toEqual(valA);
        expect(gotB).toEqual(valB);
    });

    it('should rollback changes if an error is thrown in the transaction', async () => {
        const keyRollback = new Uint8Array([0x05]);
        const valRollback = new Uint8Array([0xcc]);

        try {
            await store.transact(async txn => {
                await txn.put(keyRollback, valRollback);

                // Force an error to simulate rollback
                throw new AppError('Simulated error for rollback test');
            });
        } catch (err) {
            // ignore
        }

        // If properly rolled back, the key should not exist:
        const result = await store.transact(async txn => {
            return txn.get(keyRollback);
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
            await store.transact(async txn => {
                for (const [k, v] of keysAndValues) {
                    await txn.put(k, v);
                }
            });
        });

        it('should query keys with GtCondition', async () => {
            // Condition: key > 0x11
            const condition: Condition<Uint8Array> = {
                gt: new Uint8Array([0x11]) as GtCondition<Uint8Array>['gt'],
            };

            const results = await store.transact(txn =>
                toStream(txn.query(condition)).toArray()
            );

            expect(results.map(r => Array.from(r.key))).toEqual([
                [0x12],
                [0x13],
            ]);
        });

        it('should query keys with GteCondition', async () => {
            // Condition: key >= 0x11
            const condition: Condition<Uint8Array> = {
                gte: new Uint8Array([0x11]) as GteCondition<Uint8Array>['gte'],
            };

            const results: Array<{key: Uint8Array; value: Uint8Array}> = [];
            await store.transact(async txn => {
                for await (const kv of txn.query(condition)) {
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
            await store.transact(async txn => {
                for await (const kv of txn.query(condition)) {
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
                lte: new Uint8Array([0x12]) as LteCondition<Uint8Array>['lte'],
            };

            const results: Array<{key: Uint8Array; value: Uint8Array}> = [];
            await store.transact(async txn => {
                for await (const kv of txn.query(condition)) {
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
