import {beforeEach, describe, expect, it} from 'vitest';
import {Codec, decodeString, encodeString} from '../codec.js';
import {Context} from '../context.js';
import {Collection, CollectionEntry} from './collection.js';
import {MemKVStore} from './mem-kv-store.js';

const ctx = Context.test();
const jsonCodec: Codec<any> = {
    encode: data => encodeString(JSON.stringify(data)),
    decode: bytes => JSON.parse(decodeString(bytes)),
};

describe('Collection', () => {
    let store: MemKVStore;

    beforeEach(() => {
        store = new MemKVStore();
    });

    it('should append data into the collection and retrieve it with the correct offsets', async () => {
        await store.transact(ctx, async (ctx, tx) => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append(
                ctx,
                {value: 'A'},
                {value: 'B'},
                {value: 'C'}
            );

            const results: CollectionEntry<any>[] = [];
            for await (const entry of collection.list(ctx, 0, 3)) {
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
        await store.transact(ctx, async (ctx, tx) => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append(ctx, {value: 'X'}, {value: 'Y'});
            await collection.append(ctx, {value: 'Z'});

            const results: CollectionEntry<any>[] = [];
            for await (const entry of collection.list(ctx, 1, 3)) {
                results.push(entry);
            }

            expect(results).toEqual([
                {offset: 1, data: {value: 'Y'}},
                {offset: 2, data: {value: 'Z'}},
            ]);
        });
    });

    it('should return an empty list if the range is outside the offsets', async () => {
        await store.transact(ctx, async (ctx, tx) => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append(ctx, {value: 'A'});

            const results: CollectionEntry<any>[] = [];
            for await (const entry of collection.list(ctx, 2, 5)) {
                results.push(entry);
            }

            expect(results).toEqual([]);
        });
    });

    it('should handle overlapping ranges correctly', async () => {
        await store.transact(ctx, async (ctx, tx) => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append(
                ctx,
                {value: 'D'},
                {value: 'E'},
                {value: 'F'}
            );

            const results: CollectionEntry<any>[] = [];
            for await (const entry of collection.list(ctx, 0, 2)) {
                results.push(entry);
            }

            expect(results).toEqual([
                {offset: 0, data: {value: 'D'}},
                {offset: 1, data: {value: 'E'}},
            ]);
        });
    });

    it('should support querying with large ranges', async () => {
        await store.transact(ctx, async (ctx, tx) => {
            const collection = new Collection(tx, jsonCodec);

            await collection.append(
                ctx,
                ...Array.from({length: 1000}, (_, i) => ({value: i}))
            );

            const results: CollectionEntry<any>[] = [];
            for await (const entry of collection.list(ctx, 990, 1000)) {
                results.push(entry);
            }

            expect(results).toHaveLength(10);
            expect(results[0]).toEqual({offset: 990, data: {value: 990}});
            expect(results[9]).toEqual({offset: 999, data: {value: 999}});
        });
    });

    it('should increment offset correctly across transactions', async () => {
        await store.transact(ctx, async (ctx, tx) => {
            const collection = new Collection(tx, jsonCodec);
            await collection.append(ctx, {value: 'First'});
        });

        await store.transact(ctx, async (ctx, tx) => {
            const collection = new Collection(tx, jsonCodec);
            await collection.append(ctx, {value: 'Second'});
        });

        await store.transact(ctx, async (ctx, tx) => {
            const collection = new Collection(tx, jsonCodec);

            const results: CollectionEntry<any>[] = [];
            for await (const entry of collection.list(ctx, 0, 3)) {
                results.push(entry);
            }

            expect(results).toEqual([
                {offset: 0, data: {value: 'First'}},
                {offset: 1, data: {value: 'Second'}},
            ]);
        });
    });
});
