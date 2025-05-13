import {beforeEach, describe, expect, it} from 'vitest';
import {type Codec, decodeMsgpack, encodeMsgpack} from '../codec.js';
import {Collection, type CollectionEntry} from './collection.js';
import type {AppStore} from './kv-store.js';
import {MemMvccStore} from './mem-mvcc-store.js';
import {TupleStore} from './tuple-store.js';

const jsonCodec: Codec<any> = {
    encode: data => encodeMsgpack(JSON.stringify(data)),
    decode: bytes => JSON.parse(decodeMsgpack(bytes) as string),
};

describe('Collection', () => {
    let store: AppStore;

    beforeEach(() => {
        store = new TupleStore(new MemMvccStore());
    });

    it('should append data into the collection and retrieve it with the correct offsets', async () => {
        await store.transact(async tx => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append({value: 'A'}, {value: 'B'}, {value: 'C'});

            const results: CollectionEntry<any>[] = [];
            const entry$ = collection.list(0, 3);
            for await (const entry of entry$) {
                results.push(entry);
            }

            expect(results).toEqual([
                {offset: 0, data: {value: 'A'}},
                {offset: 1, data: {value: 'B'}},
                {offset: 2, data: {value: 'C'}},
            ]);
        });
    });

    it('should handle appending data multiple times and retrieving by ranges', async () => {
        await store.transact(async tx => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append({value: 'X'}, {value: 'Y'});
            await collection.append({value: 'Z'});

            const results: CollectionEntry<any>[] = [];
            const entry$ = collection.list(1, 3);
            for await (const entry of entry$) {
                results.push(entry);
            }

            expect(results).toEqual([
                {offset: 1, data: {value: 'Y'}},
                {offset: 2, data: {value: 'Z'}},
            ]);
        });
    });

    it('should return an empty list if the range is outside the offsets', async () => {
        await store.transact(async tx => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append({value: 'A'});

            const results: CollectionEntry<any>[] = [];
            const entry$ = collection.list(2, 5);
            for await (const entry of entry$) {
                results.push(entry);
            }

            expect(results).toEqual([]);
        });
    });

    it('should handle overlapping ranges correctly', async () => {
        await store.transact(async tx => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append({value: 'D'}, {value: 'E'}, {value: 'F'});

            const results: CollectionEntry<any>[] = [];
            const entry$ = collection.list(0, 2);
            for await (const entry of entry$) {
                results.push(entry);
            }

            expect(results).toEqual([
                {offset: 0, data: {value: 'D'}},
                {offset: 1, data: {value: 'E'}},
            ]);
        });
    });

    it('should support querying with large ranges', async () => {
        await store.transact(async tx => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append(
                ...Array.from({length: 1000}, (_, i) => ({value: i}))
            );

            const results: CollectionEntry<any>[] = [];
            const entry$ = collection.list(990, 1000);
            for await (const entry of entry$) {
                results.push(entry);
            }

            expect(results).toHaveLength(10);
            expect(results[0]).toEqual({offset: 990, data: {value: 990}});
            expect(results[9]).toEqual({offset: 999, data: {value: 999}});
        });
    });

    it('should increment offset correctly across transactions', async () => {
        await store.transact(async tx => {
            const collection = new Collection(tx, jsonCodec);
            await collection.append({value: 'First'});
        });

        await store.transact(async tx => {
            const collection = new Collection(tx, jsonCodec);
            await collection.append({value: 'Second'});
        });

        await store.transact(async tx => {
            const collection = new Collection(tx, jsonCodec);

            const results: CollectionEntry<any>[] = [];
            const entry$ = collection.list(0, 3);
            for await (const entry of entry$) {
                results.push(entry);
            }

            expect(results).toEqual([
                {offset: 0, data: {value: 'First'}},
                {offset: 1, data: {value: 'Second'}},
            ]);
        });
    });
});
