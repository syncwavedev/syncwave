import {describe, expect, it} from 'vitest';
import {Context} from '../context.js';
import {Cell} from './cell.js';
import {withPrefix} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';

const initialValue = 42;
const ctx = Context.test();

describe('Cell', () => {
    it('should return the initial value if no value is set', async () => {
        const store = new MemKVStore();

        await store.transact(ctx, async (ctx, tx) => {
            const cell = new Cell(tx, initialValue);
            const value = await cell.get(ctx);
            expect(value).toBe(initialValue);
        });
    });

    it('should store and retrieve a value', async () => {
        const store = new MemKVStore();

        await store.transact(ctx, async (ctx, tx) => {
            const cell = new Cell(tx, initialValue);
            await cell.put(ctx, 100);
            const value = await cell.get(ctx);
            expect(value).toBe(100);
        });
    });

    it('should store and retrieve the same value without put', async () => {
        const store = new MemKVStore();
        const firstValue = Math.random();

        await store.transact(ctx, async (ctx, tx) => {
            const cell = new Cell(tx, firstValue);
            const value = await cell.get(ctx);
            expect(value).toBe(firstValue);
        });

        const secondValue = Math.random();
        await store.transact(ctx, async (ctx, tx) => {
            const cell = new Cell(tx, secondValue);
            const value = await cell.get(ctx);
            expect(value).toBe(firstValue);
        });
    });

    it('should overwrite the value when put is called again', async () => {
        const store = new MemKVStore();

        await store.transact(ctx, async (ctx, tx) => {
            const cell = new Cell(tx, initialValue);
            await cell.put(ctx, 100);
            await cell.put(ctx, 200);
            const value = await cell.get(ctx);
            expect(value).toBe(200);
        });
    });

    it('should persist the value across transactions', async () => {
        const store = new MemKVStore();

        await store.transact(ctx, async (ctx, tx) => {
            const cell = new Cell(tx, initialValue);
            await cell.put(ctx, 300);
        });

        await store.transact(ctx, async (ctx, tx) => {
            const cell = new Cell(tx, initialValue);
            const value = await cell.get(ctx);
            expect(value).toBe(300);
        });
    });

    it('should handle multiple cells independently', async () => {
        const store = new MemKVStore();

        await store.transact(ctx, async (ctx, tx) => {
            const cell1 = new Cell(withPrefix('1/')(tx), initialValue);
            const cell2 = new Cell(withPrefix('2/')(tx), 100);
            await cell1.put(ctx, 400);
            await cell2.put(ctx, 500);

            const value1 = await cell1.get(ctx);
            const value2 = await cell2.get(ctx);

            expect(value1).toBe(400);
            expect(value2).toBe(500);
        });
    });

    it('should return undefined if a key is deleted', async () => {
        const store = new MemKVStore();

        await store.transact(ctx, async (ctx, tx) => {
            const cell = new Cell(tx, initialValue);
            await cell.put(ctx, 600);
            await tx.delete(ctx, new Uint8Array());
            const value = await cell.get(ctx);
            expect(value).toBe(initialValue);
        });
    });
});
