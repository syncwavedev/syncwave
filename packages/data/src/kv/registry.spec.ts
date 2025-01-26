import {beforeEach, describe, expect, it} from 'vitest';
import {StringCodec} from '../codec.js';
import {Uint8Transaction} from './kv-store.js';
import {MemKVStore} from './mem-kv-store.js';
import {Registry} from './registry.js';

const stringCodec = new StringCodec();
const createUint8Array = (input: string): Uint8Array =>
    stringCodec.encode(input);

const sampleFactory = (tx: Uint8Transaction) => ({
    async getKey(key: string): Promise<Uint8Array | undefined> {
        return tx.get(createUint8Array(key));
    },
    async putKey(key: string, value: string): Promise<void> {
        await tx.put(createUint8Array(key), createUint8Array(value));
    },
});

describe('Registry', () => {
    let kvStore: MemKVStore;

    beforeEach(() => {
        kvStore = new MemKVStore();
    });

    it('should return a constructed object from the factory', async () => {
        await kvStore.transact(async tx => {
            const registry = new Registry(tx, sampleFactory);
            const instance = registry.get('test-item');

            expect(instance).toHaveProperty('getKey');
            expect(instance).toHaveProperty('putKey');
        });
    });

    it('should throw an error for invalid item names containing "/"', async () => {
        await kvStore.transact(async tx => {
            const registry = new Registry(tx, sampleFactory);

            expect(() => registry.get('invalid/name')).toThrowError(
                'invalid item name, / is not allowed'
            );
        });
    });

    it('should correctly store and retrieve data through the factory-generated object', async () => {
        await kvStore.transact(async tx => {
            const registry = new Registry(tx, sampleFactory);
            const instance = registry.get('test-item');

            await instance.putKey('key1', 'value1');
            const value = await instance.getKey('key1');

            expect(value).toEqual(createUint8Array('value1'));
        });
    });

    it('should isolate objects with different prefixes', async () => {
        await kvStore.transact(async tx => {
            const registry = new Registry(tx, sampleFactory);
            const instance1 = registry.get('item1');
            const instance2 = registry.get('item2');

            await instance1.putKey('key', 'value1');
            await instance2.putKey('key', 'value2');

            const value1 = await instance1.getKey('key');
            const value2 = await instance2.getKey('key');

            expect(value1).toEqual(createUint8Array('value1'));
            expect(value2).toEqual(createUint8Array('value2'));
        });
    });

    it('should not find keys outside its prefix', async () => {
        await kvStore.transact(async tx => {
            const registry = new Registry(tx, sampleFactory);
            const instance1 = registry.get('item1');
            const instance2 = registry.get('item2');

            await instance1.putKey('key', 'value1');
            const value = await instance2.getKey('key');

            expect(value).toBeUndefined();
        });
    });
});
