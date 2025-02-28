import {describe, expect, it} from 'vitest';
import {Cell} from './cell.js';
import {isolate} from './kv-store.js';
import {MemMvccStore} from './mem-mvcc-store.js';
import {TupleStore} from './tuple-store.js';

const initialValue = 42;

describe('Cell', () => {
    it('should return the initial value if no value is set', async () => {
        const store = new TupleStore(new MemMvccStore());

        await store.transact(async tx => {
            const cell = new Cell(tx, initialValue);
            const value = await cell.get();
            expect(value).toBe(initialValue);
        });
    });

    it('should store and retrieve a value', async () => {
        const store = new TupleStore(new MemMvccStore());

        await store.transact(async tx => {
            const cell = new Cell(tx, initialValue);
            await cell.put(100);
            const value = await cell.get();
            expect(value).toBe(100);
        });
    });

    it('should store and retrieve the same value without put', async () => {
        const store = new TupleStore(new MemMvccStore());
        const firstValue = Math.random();

        await store.transact(async tx => {
            const cell = new Cell(tx, firstValue);
            const value = await cell.get();
            expect(value).toBe(firstValue);
        });

        const secondValue = Math.random();
        await store.transact(async tx => {
            const cell = new Cell(tx, secondValue);
            const value = await cell.get();
            expect(value).toBe(firstValue);
        });
    });

    it('should overwrite the value when put is called again', async () => {
        const store = new TupleStore(new MemMvccStore());

        await store.transact(async tx => {
            const cell = new Cell(tx, initialValue);
            await cell.put(100);
            await cell.put(200);
            const value = await cell.get();
            expect(value).toBe(200);
        });
    });

    it('should persist the value across transactions', async () => {
        const store = new TupleStore(new MemMvccStore());

        await store.transact(async tx => {
            const cell = new Cell(tx, initialValue);
            await cell.put(300);
        });

        await store.transact(async tx => {
            const cell = new Cell(tx, initialValue);
            const value = await cell.get();
            expect(value).toBe(300);
        });
    });

    it('should handle multiple cells independently', async () => {
        const store = new TupleStore(new MemMvccStore());

        await store.transact(async tx => {
            const cell1 = new Cell(isolate(['1/'])(tx), initialValue);
            const cell2 = new Cell(isolate(['2/'])(tx), 100);
            await cell1.put(400);
            await cell2.put(500);

            const value1 = await cell1.get();
            const value2 = await cell2.get();

            expect(value1).toBe(400);
            expect(value2).toBe(500);
        });
    });

    it('should return undefined if a key is deleted', async () => {
        const store = new TupleStore(new MemMvccStore());

        await store.transact(async tx => {
            const cell = new Cell(tx, initialValue);
            await cell.put(600);
            await tx.delete([]);
            const value = await cell.get();
            expect(value).toBe(initialValue);
        });
    });
});
