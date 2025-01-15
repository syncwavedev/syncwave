import {StreamingMode} from 'foundationdb';
import {
    Condition,
    Deferred,
    GtCondition,
    GteCondition,
    LtCondition,
    LteCondition,
    PrefixedKVStore,
    Uint8KVStore,
    astream,
} from 'ground-data';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {FoundationDBUint8KVStore} from './fdb-kv-store';

describe.skip('FoundationDBUint8KVStore (localhost:4500)', () => {
    let store: Uint8KVStore;
    let fdbStore: FoundationDBUint8KVStore;

    beforeAll(() => {
        fdbStore = new FoundationDBUint8KVStore();
        store = new PrefixedKVStore(fdbStore, '\x00');
    });

    // clean up
    afterAll(async () => {
        await store.transaction(async txn => {
            for await (const {key} of txn.query({gte: new Uint8Array()})) {
                await txn.delete(key);
            }
        });
    });

    it('should return undefined for a missing key', async () => {
        const result = await store.transaction(async txn => {
            return txn.get(new Uint8Array([0xaa, 0xbb]));
        });
        expect(result).toBeUndefined();
    });

    it('should put and get a key', async () => {
        const key = new Uint8Array([0x01]);
        const value = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

        await store.transaction(async txn => {
            await txn.put(key, value);
        });

        const fetchedValue = await store.transaction(async txn => {
            return txn.get(key);
        });
        expect(fetchedValue).toEqual(value);
    });

    it('should delete a key', async () => {
        const keyToDelete = new Uint8Array([0x02]);
        const value = new Uint8Array([0x11, 0x22]);

        await store.transaction(async txn => {
            await txn.put(keyToDelete, value);
        });

        await store.transaction(async txn => {
            await txn.delete(keyToDelete);
        });

        const resultAfterDelete = await store.transaction(async txn => {
            return txn.get(keyToDelete);
        });
        expect(resultAfterDelete).toBeUndefined();
    });

    it('should handle multiple operations in one transaction', async () => {
        const keyA = new Uint8Array([0x03]);
        const keyB = new Uint8Array([0x04]);
        const valA = new Uint8Array([0xa1]);
        const valB = new Uint8Array([0xb2]);

        await store.transaction(async txn => {
            await txn.put(keyA, valA);
            await txn.put(keyB, valB);
        });

        const [gotA, gotB] = await store.transaction(async txn => {
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
            await store.transaction(async txn => {
                await txn.put(keyRollback, valRollback);

                // Force an error to simulate rollback
                throw new Error('Simulated error for rollback test');
            });
        } catch (err) {
            // ignore
        }

        // If properly rolled back, the key should not exist:
        const result = await store.transaction(async txn => {
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

        beforeAll(async () => {
            await store.transaction(async txn => {
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

            const results = await store.transaction(txn => astream(txn.query(condition)).toArray());

            const all = await fdbStore['db'].getRangeAll('\x00');

            console.log('all', all);

            const some = await fdbStore['db'].doTransaction(async tx => {
                return await astream(
                    tx.getRange(Buffer.from([0x00, 0x11]), undefined, {
                        limit: 1000,
                        streamingMode: StreamingMode.WantAll,
                        targetBytes: 123,
                    })
                ).toArray();
            });

            console.log({some});

            expect(results.map(r => Array.from(r.key))).toEqual([[0x12], [0x13]]);
        });

        it.only('test conflicts', async () => {
            const db = fdbStore['db'];

            let total = 0;
            await db.doTransaction(async tx => {
                tx.clearRange('\x31', '\xff');

                for (let i = 1 << 17; i < 1 << 18; i += 1) {
                    total += 1;
                    tx.set(Buffer.from(i.toString()), '1');
                    // console.log(Buffer.from(i.toString()));
                }

                console.log('insert');
            });

            const signalA = new Deferred();
            const signalB = new Deferred();

            let attempts = 0;

            const query = db.doTransaction(async tx => {
                attempts += 1;
                console.log('start');

                let counter = 0;
                let lastKey: any;
                let lastVal: any;
                const startTime = performance.now();
                for await (const [key, value] of tx.getRange('\x31', '\xff')) {
                    // console.log(key);
                    counter += 1;
                    lastKey = key;
                    lastVal = value;

                    // break;
                }

                signalA.resolve(1);
                await signalB.promise;

                tx.set(Buffer.from('162142'), lastVal);

                console.log({
                    counter,
                    total,
                    time: performance.now() - startTime,
                    lastKey,
                    lastKeyStr: lastKey?.toString(),
                    lastVal,
                    lastValStr: lastVal?.toString(),
                });
            });

            await db.doTransaction(async tx => {
                await signalA.promise;

                tx.set(Buffer.from('262143'), '4');
            });
            console.log('finish');
            signalB.resolve(1);

            await query;

            await db.doTransaction(async tx => {
                console.log({result: (await tx.get(Buffer.from('262142')))?.toString(), attempts});
            });
        });

        it('should query keys with GteCondition', async () => {
            // Condition: key >= 0x11
            const condition: Condition<Uint8Array> = {
                gte: new Uint8Array([0x11]) as GteCondition<Uint8Array>['gte'],
            };

            const results: Array<{key: Uint8Array; value: Uint8Array}> = [];
            await store.transaction(async txn => {
                for await (const kv of txn.query(condition)) {
                    results.push(kv);
                }
            });

            expect(results.map(r => Array.from(r.key))).toEqual([[0x11], [0x12], [0x13]]);
        });

        it('should query keys with LtCondition', async () => {
            // Condition: key < 0x12
            const condition: Condition<Uint8Array> = {
                lt: new Uint8Array([0x12]) as LtCondition<Uint8Array>['lt'],
            };

            const results: Array<{key: Uint8Array; value: Uint8Array}> = [];
            await store.transaction(async txn => {
                for await (const kv of txn.query(condition)) {
                    results.push(kv);
                }
            });

            expect(results.map(r => Array.from(r.key))).toEqual([[0x11], [0x10]]);
        });

        it('should query keys with LteCondition', async () => {
            // Condition: key <= 0x12
            const condition: Condition<Uint8Array> = {
                lte: new Uint8Array([0x12]) as LteCondition<Uint8Array>['lte'],
            };

            const results: Array<{key: Uint8Array; value: Uint8Array}> = [];
            await store.transaction(async txn => {
                for await (const kv of txn.query(condition)) {
                    results.push(kv);
                }
            });

            expect(results.map(r => Array.from(r.key))).toEqual([[0x12], [0x11], [0x10]]);
        });
    });
});
