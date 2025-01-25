import {beforeEach, describe, expect, it} from 'vitest';
import {Counter} from './counter.js';
import {Uint8KVStore, withPrefix} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';

describe('Counter', () => {
    let kvStore: Uint8KVStore;

    beforeEach(() => {
        kvStore = new MemKVStore();
    });

    it('should initialize with the provided initial value', async () => {
        await kvStore.transaction(async tx => {
            const counter = new Counter(tx, 5);
            const value = await counter.get();
            expect(value).toBe(5);
        });
    });

    it('should increment the value', async () => {
        await kvStore.transaction(async tx => {
            const counter = new Counter(tx, 5);

            const newValue = await counter.increment();
            expect(newValue).toBe(6);

            const finalValue = await counter.get();
            expect(finalValue).toBe(6);
        });
    });

    it('should increment multiple times correctly', async () => {
        await kvStore.transaction(async tx => {
            const counter = new Counter(tx, 0);

            await counter.increment();
            await counter.increment();
            const value = await counter.increment();

            expect(value).toBe(3);
        });
    });

    it('should handle concurrent transactions correctly', async () => {
        await kvStore.transaction(async tx => {
            const counter1 = new Counter(withPrefix('1/')(tx), 10);
            const counter2 = new Counter(withPrefix('2/')(tx), 10);

            const value1 = await counter1.increment();
            const value2 = await counter2.increment();

            expect(value1).toBe(11);
            expect(value2).toBe(11);
        });
    });

    it('should persist value across transactions', async () => {
        await kvStore.transaction(async tx => {
            const counter = new Counter(tx, 7);
            await counter.increment();
        });

        await kvStore.transaction(async tx => {
            const counter = new Counter(tx, 0); // Initial value should not matter since it reads from storage.
            const value = await counter.get();
            expect(value).toBe(8);
        });
    });

    it('should handle large increments', async () => {
        await kvStore.transaction(async tx => {
            const counter = new Counter(tx, 0);

            for (let i = 0; i <= 100; i++) {
                await counter.increment(i);
            }

            const value = await counter.get();
            expect(value).toBe(5050);
        });
    });

    it('should initialize multiple counters independently', async () => {
        await kvStore.transaction(async tx => {
            const counter1 = new Counter(withPrefix('1/')(tx), 3);
            const counter2 = new Counter(withPrefix('2/')(tx), 10);

            const value1 = await counter1.get();
            const value2 = await counter2.get();

            expect(value1).toBe(3);
            expect(value2).toBe(10);
        });
    });
});
