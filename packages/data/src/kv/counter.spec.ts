import {beforeEach, describe, expect, it} from 'vitest';
import {Context} from '../context.js';
import {Counter} from './counter.js';
import {Uint8KVStore, withPrefix} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';

const ctx = Context.test();

describe('Counter', () => {
    let kvStore: Uint8KVStore;

    beforeEach(() => {
        kvStore = new MemKVStore();
    });

    it('should initialize with the provided initial value', async () => {
        await kvStore.transact(ctx, async (ctx, tx) => {
            const counter = new Counter(tx, 5);
            const value = await counter.get(ctx);
            expect(value).toBe(5);
        });
    });

    it('should increment the value', async () => {
        await kvStore.transact(ctx, async (ctx, tx) => {
            const counter = new Counter(tx, 5);

            const newValue = await counter.increment(ctx);
            expect(newValue).toBe(6);

            const finalValue = await counter.get(ctx);
            expect(finalValue).toBe(6);
        });
    });

    it('should increment multiple times correctly', async () => {
        await kvStore.transact(ctx, async (ctx, tx) => {
            const counter = new Counter(tx, 0);

            await counter.increment(ctx);
            await counter.increment(ctx);
            const value = await counter.increment(ctx);

            expect(value).toBe(3);
        });
    });

    it('should handle concurrent transactions correctly', async () => {
        await kvStore.transact(ctx, async (ctx, tx) => {
            const counter1 = new Counter(withPrefix('1/')(tx), 10);
            const counter2 = new Counter(withPrefix('2/')(tx), 10);

            const value1 = await counter1.increment(ctx);
            const value2 = await counter2.increment(ctx);

            expect(value1).toBe(11);
            expect(value2).toBe(11);
        });
    });

    it('should persist value across transactions', async () => {
        await kvStore.transact(ctx, async (ctx, tx) => {
            const counter = new Counter(tx, 7);
            await counter.increment(ctx);
        });

        await kvStore.transact(ctx, async (ctx, tx) => {
            const counter = new Counter(tx, 0); // Initial value should not matter since it reads from storage.
            const value = await counter.get(ctx);
            expect(value).toBe(8);
        });
    });

    it('should handle large increments', async () => {
        await kvStore.transact(ctx, async (ctx, tx) => {
            const counter = new Counter(tx, 0);

            for (let i = 0; i <= 100; i++) {
                await counter.increment(ctx, i);
            }

            const value = await counter.get(ctx);
            expect(value).toBe(5050);
        });
    });

    it('should initialize multiple counters independently', async () => {
        await kvStore.transact(ctx, async (ctx, tx) => {
            const counter1 = new Counter(withPrefix('1/')(tx), 3);
            const counter2 = new Counter(withPrefix('2/')(tx), 10);

            const value1 = await counter1.get(ctx);
            const value2 = await counter2.get(ctx);

            expect(value1).toBe(3);
            expect(value2).toBe(10);
        });
    });
});
