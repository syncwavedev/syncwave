import {describe, expect, it} from 'vitest';
import {Cell} from './cell.js';
import {withPrefix} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';

const initialValue = 42;

describe('Cell', () => {
    it('should return the initial value if no value is set', async () => {
        const store = new MemKVStore();

        await store.transaction(async tx => {
            const cell = new Cell(tx, initialValue);
            const value = await cell.get();
            expect(value).toBe(initialValue);
        });
    });

    it('should store and retrieve a value', async () => {
        const store = new MemKVStore();

        await store.transaction(async tx => {
            const cell = new Cell(tx, initialValue);
            await cell.put(100);
            const value = await cell.get();
            expect(value).toBe(100);
        });
    });

    it('should overwrite the value when put is called again', async () => {
        const store = new MemKVStore();

        await store.transaction(async tx => {
            const cell = new Cell(tx, initialValue);
            await cell.put(100);
            await cell.put(200);
            const value = await cell.get();
            expect(value).toBe(200);
        });
    });

    it('should persist the value across transactions', async () => {
        const store = new MemKVStore();

        await store.transaction(async tx => {
            const cell = new Cell(tx, initialValue);
            await cell.put(300);
        });

        await store.transaction(async tx => {
            const cell = new Cell(tx, initialValue);
            const value = await cell.get();
            expect(value).toBe(300);
        });
    });

    it('should handle multiple cells independently', async () => {
        const store = new MemKVStore();

        await store.transaction(async tx => {
            const cell1 = new Cell(withPrefix('1/')(tx), initialValue);
            const cell2 = new Cell(withPrefix('2/')(tx), 100);
            await cell1.put(400);
            await cell2.put(500);

            const value1 = await cell1.get();
            const value2 = await cell2.get();

            expect(value1).toBe(400);
            expect(value2).toBe(500);
        });
    });

    it('should return undefined if a key is deleted', async () => {
        const store = new MemKVStore();

        await store.transaction(async tx => {
            const cell = new Cell(tx, initialValue);
            await cell.put(600);
            await tx.delete(new Uint8Array());
            const value = await cell.get();
            expect(value).toBe(initialValue);
        });
    });
});
