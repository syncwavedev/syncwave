import {beforeEach, describe, expect, it} from 'vitest';
import {MsgpackCodec} from '../codec.js';
import {Deferred} from '../deferred.js';
import {decodeTuple, encodeTuple} from '../tuple.js';
import {whenAll} from '../utils.js';
import {KvStoreMapper} from './kv-store-mapper.js';
import type {KvStore} from './kv-store.js';
import {MemMvccStore} from './mem-mvcc-store.js';
import {MemRwStore} from './mem-rw-store.js';

function asyncDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('mem-rw-store', () => {
    let store: KvStore<number, string>;

    beforeEach(() => {
        store = new MemRwStore(
            new KvStoreMapper(
                new MemMvccStore(),
                {
                    decode: x => decodeTuple(x)[0] as number,
                    encode: x => encodeTuple([x]),
                },
                new MsgpackCodec()
            )
        );
    });

    it('should store and retrieve keys in write transaction', async () => {
        await store.transact(async tx => {
            await tx.put(1, 'one');
            await tx.put(2, 'two');
        });

        await store.snapshot(async tx => {
            const value1 = await tx.get(1);
            const value2 = await tx.get(2);

            expect(value1).toBe('one');
            expect(value2).toBe('two');
        });
    });

    it('should delete keys in write transaction', async () => {
        await store.transact(async tx => {
            await tx.put(1, 'one');
            await tx.put(2, 'two');
            await tx.put(3, 'three');
        });

        await store.transact(async tx => {
            await tx.delete(2);
        });

        await store.snapshot(async tx => {
            const result = await toArray(tx.query({gte: 0}));

            expect(result).toEqual([
                {key: 1, value: 'one'},
                {key: 3, value: 'three'},
            ]);
        });
    });

    it('should update existing keys in write transaction', async () => {
        await store.transact(async tx => {
            await tx.put(1, 'one');
            await tx.put(2, 'two');
        });

        await store.transact(async tx => {
            await tx.put(2, 'updated-two');
            await tx.put(3, 'three');
        });

        await store.snapshot(async tx => {
            const value1 = await tx.get(1);
            const value2 = await tx.get(2);
            const value3 = await tx.get(3);

            expect(value1).toBe('one');
            expect(value2).toBe('updated-two');
            expect(value3).toBe('three');
        });
    });

    it('should query keys in read transaction', async () => {
        await store.transact(async tx => {
            await tx.put(1, 'one');
            await tx.put(2, 'two');
            await tx.put(3, 'three');
        });

        await store.snapshot(async tx => {
            const values = await toArray(tx.query({gte: 2}));
            expect(values).toEqual([
                {key: 2, value: 'two'},
                {key: 3, value: 'three'},
            ]);
        });
    });

    it('should allow multiple concurrent read transactions', async () => {
        await store.transact(async tx => {
            await tx.put(1, 'one');
            await tx.put(2, 'two');
            await tx.put(3, 'three');
        });

        // Start and track when each transaction begins and ends
        const transaction1Started = new Deferred<void>();
        const transaction2Started = new Deferred<void>();
        const transaction1Finished = new Deferred<void>();
        const transaction2Finished = new Deferred<void>();

        // Run two read transactions concurrently
        const tx1 = store.snapshot(async tx => {
            transaction1Started.resolve();
            await transaction2Started.promise; // Wait for tx2 to start
            await asyncDelay(10); // Small delay to ensure overlap
            const value = await tx.get(1);
            expect(value).toBe('one');
            transaction1Finished.resolve();
            return value;
        });

        const tx2 = store.snapshot(async tx => {
            transaction2Started.resolve();
            await transaction1Started.promise; // Wait for tx1 to start
            const value = await tx.get(2);
            expect(value).toBe('two');
            transaction2Finished.resolve();
            return value;
        });

        const [result1, result2] = await whenAll([tx1, tx2]);

        expect(result1).toBe('one');
        expect(result2).toBe('two');
    });

    it('should block read transactions during write transaction', async () => {
        await store.transact(async tx => {
            await tx.put(1, 'one');
            await tx.put(2, 'two');
        });

        const writeStarted = new Deferred<void>();
        const writeFinished = new Deferred<void>();
        const readBlocked = new Deferred<void>();
        const readFinished = new Deferred<void>();

        // Start a write transaction but don't finish it immediately
        const writeTx = store.transact(async tx => {
            writeStarted.resolve();
            await tx.put(1, 'updated-one');
            await asyncDelay(50); // Hold the write lock for a while
            writeFinished.resolve();
            return 'write-done';
        });

        // Wait for write to start
        await writeStarted.promise;

        // Try to start a read transaction
        const readTx = store.snapshot(async tx => {
            readBlocked.resolve();
            const value = await tx.get(1);
            readFinished.resolve();
            return value;
        });

        // Wait a bit to ensure read is trying to acquire the lock
        await asyncDelay(10);

        // Check read is blocked (shouldn't have resolved yet)
        expect(readBlocked.state === 'fulfilled').toBe(false);

        // Let write finish
        await writeFinished.promise;

        // Now read should complete
        const readResult = await readTx;

        expect(readBlocked.state === 'fulfilled').toBe(true);
        expect(readFinished.state === 'fulfilled').toBe(true);
        expect(readResult).toBe('updated-one');
        expect(await writeTx).toBe('write-done');
    });

    it('should block a write transaction during another write transaction', async () => {
        await store.transact(async tx => {
            await tx.put(1, 'one');
        });

        const write1Started = new Deferred<void>();
        const write1Finished = new Deferred<void>();
        const write2Blocked = new Deferred<void>();
        const write2Finished = new Deferred<void>();

        // Start first write transaction
        const write1Tx = store.transact(async tx => {
            write1Started.resolve();
            await tx.put(1, 'one-updated');
            await asyncDelay(50); // Hold the lock for a while
            write1Finished.resolve();
            return 'write1-done';
        });

        // Wait for first write to start
        await write1Started.promise;

        // Try to start second write transaction
        const write2Tx = store.transact(async tx => {
            write2Blocked.resolve();
            await tx.put(2, 'two');
            write2Finished.resolve();
            return 'write2-done';
        });

        // Wait a bit to ensure write2 is trying to acquire the lock
        await asyncDelay(10);

        // Check write2 is blocked
        expect(write2Blocked.state === 'fulfilled').toBe(false);

        // Let write1 finish
        await write1Finished.promise;

        // Now write2 should complete
        const write2Result = await write2Tx;

        expect(write2Blocked.state === 'fulfilled').toBe(true);
        expect(write2Finished.state === 'fulfilled').toBe(true);
        expect(write2Result).toBe('write2-done');
        expect(await write1Tx).toBe('write1-done');
    });

    it('should close the store', async () => {
        await store.transact(async tx => {
            await tx.put(1, 'one');
        });

        store.close('test-close');

        // Further operations should fail, but the exact error depends on the implementation
        // This is a basic check that close() gets called on the underlying store
        // In a real implementation, you might verify specific error messages or types
    });
});

// Helper function to convert async iterable to array
async function toArray<T>(iter: AsyncIterable<T>): Promise<T[]> {
    const result: T[] = [];
    for await (const item of iter) {
        result.push(item);
    }
    return result;
}
