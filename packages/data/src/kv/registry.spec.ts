import {beforeEach, describe, expect, it} from 'vitest';
import {encodeString} from '../codec.js';
import {Cx} from '../context.js';
import {Uint8Transaction} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';
import {Registry} from './registry.js';

const cx = Cx.test();

const sampleFactory = (tx: Uint8Transaction) => ({
    async getKey(cx: Cx, key: string): Promise<Uint8Array | undefined> {
        return tx.get(cx, encodeString(cx, key));
    },
    async putKey(cx: Cx, key: string, value: string): Promise<void> {
        await tx.put(cx, encodeString(cx, key), encodeString(cx, value));
    },
});

describe('Registry', () => {
    let kvStore: MemKVStore;

    beforeEach(() => {
        kvStore = new MemKVStore();
    });

    it('should return a constructed object from the factory', async () => {
        await kvStore.transact(cx, async (cx, tx) => {
            const registry = new Registry(tx, sampleFactory);
            const instance = registry.get(cx, 'test-item');

            expect(instance).toHaveProperty('getKey');
            expect(instance).toHaveProperty('putKey');
        });
    });

    it('should throw an error for invalid item names containing "/"', async () => {
        await kvStore.transact(cx, async (cx, tx) => {
            const registry = new Registry(tx, sampleFactory);

            expect(() => registry.get(cx, 'invalid/name')).toThrowError(
                'invalid item name, / is not allowed'
            );
        });
    });

    it('should correctly store and retrieve data through the factory-generated object', async () => {
        await kvStore.transact(cx, async (cx, tx) => {
            const registry = new Registry(tx, sampleFactory);
            const instance = registry.get(cx, 'test-item');

            await instance.putKey(cx, 'key1', 'value1');
            const value = await instance.getKey(cx, 'key1');

            expect(value).toEqual(encodeString(cx, 'value1'));
        });
    });

    it('should isolate objects with different prefixes', async () => {
        await kvStore.transact(cx, async (cx, tx) => {
            const registry = new Registry(tx, sampleFactory);
            const instance1 = registry.get(cx, 'item1');
            const instance2 = registry.get(cx, 'item2');

            await instance1.putKey(cx, 'key', 'value1');
            await instance2.putKey(cx, 'key', 'value2');

            const value1 = await instance1.getKey(cx, 'key');
            const value2 = await instance2.getKey(cx, 'key');

            expect(value1).toEqual(encodeString(cx, 'value1'));
            expect(value2).toEqual(encodeString(cx, 'value2'));
        });
    });

    it('should not find keys outside its prefix', async () => {
        await kvStore.transact(cx, async (cx, tx) => {
            const registry = new Registry(tx, sampleFactory);
            const instance1 = registry.get(cx, 'item1');
            const instance2 = registry.get(cx, 'item2');

            await instance1.putKey(cx, 'key', 'value1');
            const value = await instance2.getKey(cx, 'key');

            expect(value).toBeUndefined();
        });
    });
});
