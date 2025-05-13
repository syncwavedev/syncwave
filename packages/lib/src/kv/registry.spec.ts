import {beforeEach, describe, expect, it} from 'vitest';
import {encodeMsgpack} from '../codec.js';
import type {AppStore, AppTransaction} from './kv-store.js';
import {MemMvccStore} from './mem-mvcc-store.js';
import {Registry} from './registry.js';
import {TupleStore} from './tuple-store.js';

const sampleFactory = (tx: AppTransaction) => ({
    async getKey(key: string): Promise<Uint8Array | undefined> {
        return tx.get([key]);
    },
    async putKey(key: string, value: string): Promise<void> {
        await tx.put([key], encodeMsgpack(value));
    },
});

describe('Registry', () => {
    let kvStore: AppStore;

    beforeEach(() => {
        kvStore = new TupleStore(new MemMvccStore());
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

            expect(value).toEqual(encodeMsgpack('value1'));
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

            expect(value1).toEqual(encodeMsgpack('value1'));
            expect(value2).toEqual(encodeMsgpack('value2'));
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
