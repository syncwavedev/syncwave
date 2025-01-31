import {describe, expect, it} from 'vitest';
import {Cx} from '../context.js';
import {Cell} from './cell.js';
import {withPrefix} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';

const initialValue = 42;
const cx = Cx.test();

describe('Cell', () => {
    it('should return the initial value if no value is set', async () => {
        const store = new MemKVStore();

        await store.transact(cx, async (cx, tx) => {
            const cell = new Cell(tx, initialValue);
            const value = await cell.get(cx);
            expect(value).toBe(initialValue);
        });
    });

    it('should store and retrieve a value', async () => {
        const store = new MemKVStore();

        await store.transact(cx, async (cx, tx) => {
            const cell = new Cell(tx, initialValue);
            await cell.put(cx, 100);
            const value = await cell.get(cx);
            expect(value).toBe(100);
        });
    });

    it('should store and retrieve the same value without put', async () => {
        const store = new MemKVStore();
        const firstValue = Math.random();

        await store.transact(cx, async (cx, tx) => {
            const cell = new Cell(tx, firstValue);
            const value = await cell.get(cx);
            expect(value).toBe(firstValue);
        });

        const secondValue = Math.random();
        await store.transact(cx, async (cx, tx) => {
            const cell = new Cell(tx, secondValue);
            const value = await cell.get(cx);
            expect(value).toBe(firstValue);
        });
    });

    it('should overwrite the value when put is called again', async () => {
        const store = new MemKVStore();

        await store.transact(cx, async (cx, tx) => {
            const cell = new Cell(tx, initialValue);
            await cell.put(cx, 100);
            await cell.put(cx, 200);
            const value = await cell.get(cx);
            expect(value).toBe(200);
        });
    });

    it('should persist the value across transactions', async () => {
        const store = new MemKVStore();

        await store.transact(cx, async (cx, tx) => {
            const cell = new Cell(tx, initialValue);
            await cell.put(cx, 300);
        });

        await store.transact(cx, async (cx, tx) => {
            const cell = new Cell(tx, initialValue);
            const value = await cell.get(cx);
            expect(value).toBe(300);
        });
    });

    it('should handle multiple cells independently', async () => {
        const store = new MemKVStore();

        await store.transact(cx, async (cx, tx) => {
            const cell1 = new Cell(withPrefix('1/')(tx), initialValue);
            const cell2 = new Cell(withPrefix('2/')(tx), 100);
            await cell1.put(cx, 400);
            await cell2.put(cx, 500);

            const value1 = await cell1.get(cx);
            const value2 = await cell2.get(cx);

            expect(value1).toBe(400);
            expect(value2).toBe(500);
        });
    });

    it('should return undefined if a key is deleted', async () => {
        const store = new MemKVStore();

        await store.transact(cx, async (cx, tx) => {
            const cell = new Cell(tx, initialValue);
            await cell.put(cx, 600);
            await tx.delete(cx, new Uint8Array());
            const value = await cell.get(cx);
            expect(value).toBe(initialValue);
        });
    });
});
