import {describe, expect, it} from 'vitest';
import {toStream} from '../stream.js';
import {compareUint8Array} from '../utils.js';
import {Uuid, createUuid} from '../uuid.js';
import {createIndex, decodeIndexKey, encodeIndexKey} from './data-index.js';
import {MemKVStore} from './mem-kv-store.js';

interface TestUser {
    id: Uuid;
    houseId?: Uuid | null | undefined;
    name?: string | null | undefined;
    age?: number | null | undefined;
    ssi?: string | null | undefined;
    ready?: boolean | null | undefined;
    pet?: string | null | undefined;
    avatar?: Uint8Array | null | undefined;
}

const INDEX_NAME = 'some_index_name';

const idSelector = (x: TestUser) => [x.id];

async function getTxn() {
    const store = new MemKVStore();
    const tx = await store.transact(async tx => tx);

    return {store, tx};
}

describe('data-index', async () => {
    it('should insert/update/delete doc', async () => {
        const {tx} = await getTxn();
        const houseIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
            indexName: INDEX_NAME,
        });
        const id1 = createUuid();
        const id2 = createUuid();
        const id3 = createUuid();
        await houseIndex.sync(undefined, {id: id1, houseId: null});
        await houseIndex.sync(undefined, {id: id2, houseId: createUuid()});
        await houseIndex.sync(undefined, {id: id3});

        expect(
            await toStream(houseIndex.query({gte: [null]})).toArray()
        ).toEqual([[id1], [id2], [id3]]);
        expect(await toStream(houseIndex.get([null])).toArray()).toEqual([
            [id1],
        ]);

        await houseIndex.sync({id: id1, houseId: null}, {id: id1});

        // houseId is undefined, so id1 goes after id2
        expect(
            await toStream(houseIndex.query({gte: [null]})).toArray()
        ).toEqual([[id2], [id1], [id3]]);
        expect(await toStream(houseIndex.get([null])).toArray()).toEqual([]);

        await houseIndex.sync({id: id1}, {id: id1, houseId: null});
        await houseIndex.sync({id: id3}, undefined);

        expect(
            await toStream(houseIndex.query({gte: [null]})).toArray()
        ).toEqual([[id1], [id2]]);
        expect(await toStream(houseIndex.get([null])).toArray()).toEqual([
            [id1],
        ]);
    });

    it('should enforce unique index constraint', async () => {
        const {tx} = await getTxn();
        const uniqueIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: true,
            indexName: INDEX_NAME,
        });

        const id1 = createUuid();
        const houseId = createUuid();

        await uniqueIndex.sync(undefined, {id: id1, houseId});
        await expect(
            uniqueIndex.sync(undefined, {id: createUuid(), houseId})
        ).rejects.toThrow(
            'Unique index constraint violation. Index name: some_index_name'
        );
    });

    it('should handle queries with undefined keys', async () => {
        const {tx} = await getTxn();
        const index = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
            indexName: INDEX_NAME,
        });

        const id1 = createUuid();
        const id2 = createUuid();
        await index.sync(undefined, {id: id1, houseId: undefined});
        await index.sync(undefined, {id: id2, houseId: null});

        expect(await toStream(index.query({gte: [null]})).toArray()).toEqual([
            [id2],
            [id1],
        ]);
    });

    it('should support compound index queries', async () => {
        const {tx} = await getTxn();
        const compoundIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId, x.age],
            unique: false,
            indexName: INDEX_NAME,
        });

        const id1 = createUuid();
        const id2 = createUuid();
        const id3 = createUuid();
        const id4 = createUuid();
        const id5 = createUuid();
        const houseId1 = createUuid();
        const houseId2 = createUuid();

        await compoundIndex.sync(undefined, {
            id: id1,
            houseId: houseId1,
            age: 25,
        });
        await compoundIndex.sync(undefined, {
            id: id2,
            houseId: houseId1,
            age: 30,
        });
        await compoundIndex.sync(undefined, {
            id: id3,
            houseId: houseId1,
            age: 30,
        });
        await compoundIndex.sync(undefined, {
            id: id4,
            houseId: houseId1,
            age: 35,
        });
        await compoundIndex.sync(undefined, {
            id: id5,
            houseId: houseId2,
            age: 35,
        });

        expect(
            await toStream(
                compoundIndex.query({gte: [houseId1, null]})
            ).toArray()
        ).toEqual([[id1], [id2], [id3], [id4]]);
        expect(
            await toStream(compoundIndex.query({gte: [houseId1, 25]})).toArray()
        ).toEqual([[id1], [id2], [id3], [id4]]);
        expect(
            await toStream(compoundIndex.query({gt: [houseId1, 25]})).toArray()
        ).toEqual([[id2], [id3], [id4]]);
        expect(
            await toStream(compoundIndex.query({gt: [houseId1, 30]})).toArray()
        ).toEqual([[id4]]);
        expect(
            await toStream(compoundIndex.query({gt: [houseId1, 35]})).toArray()
        ).toEqual([]);
        expect(
            await toStream(
                compoundIndex.query({gte: [houseId1, undefined]})
            ).toArray()
        ).toEqual([]);

        expect(
            await toStream(
                compoundIndex.query({lte: [houseId1, undefined]})
            ).toArray()
        ).toEqual([[id4], [id3], [id2], [id1]]);
        expect(
            await toStream(
                compoundIndex.query({lt: [houseId1, undefined]})
            ).toArray()
        ).toEqual([[id4], [id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lte: [houseId1, 36]})).toArray()
        ).toEqual([[id4], [id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lte: [houseId1, 35]})).toArray()
        ).toEqual([[id4], [id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lt: [houseId1, 35]})).toArray()
        ).toEqual([[id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lt: [houseId1, 30]})).toArray()
        ).toEqual([[id1]]);
        expect(
            await toStream(compoundIndex.query({lt: [houseId1, 10]})).toArray()
        ).toEqual([]);
        expect(
            await toStream(
                compoundIndex.query({lte: [houseId1, null]})
            ).toArray()
        ).toEqual([]);

        expect(
            await toStream(compoundIndex.query({gte: [null]})).toArray()
        ).toEqual([[id1], [id2], [id3], [id4], [id5]]);
        expect(
            await toStream(compoundIndex.query({gt: [null]})).toArray()
        ).toEqual([[id1], [id2], [id3], [id4], [id5]]);
        expect(
            await toStream(compoundIndex.query({gte: [houseId1]})).toArray()
        ).toEqual([[id1], [id2], [id3], [id4], [id5]]);
        expect(
            await toStream(compoundIndex.query({gt: [houseId1]})).toArray()
        ).toEqual([[id5]]);
        expect(
            await toStream(compoundIndex.query({gte: [houseId2]})).toArray()
        ).toEqual([[id5]]);
        expect(
            await toStream(compoundIndex.query({gt: [houseId2]})).toArray()
        ).toEqual([]);
        expect(
            await toStream(compoundIndex.query({gte: [undefined]})).toArray()
        ).toEqual([]);
        expect(
            await toStream(compoundIndex.query({gt: [undefined]})).toArray()
        ).toEqual([]);

        expect(
            await toStream(compoundIndex.query({lte: [undefined]})).toArray()
        ).toEqual([[id5], [id4], [id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lt: [undefined]})).toArray()
        ).toEqual([[id5], [id4], [id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lte: [houseId2]})).toArray()
        ).toEqual([[id5], [id4], [id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lt: [houseId2]})).toArray()
        ).toEqual([[id4], [id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lte: [houseId1]})).toArray()
        ).toEqual([[id4], [id3], [id2], [id1]]);
        expect(
            await toStream(compoundIndex.query({lt: [houseId1]})).toArray()
        ).toEqual([]);
        expect(
            await toStream(compoundIndex.query({lte: [null]})).toArray()
        ).toEqual([]);
        expect(
            await toStream(compoundIndex.query({lt: [null]})).toArray()
        ).toEqual([]);
    });

    it('should correctly delete entries', async () => {
        const {tx} = await getTxn();
        const index = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
            indexName: INDEX_NAME,
        });

        const id1 = createUuid();
        const houseId = createUuid();

        await index.sync(undefined, {id: id1, houseId});
        expect(await toStream(index.get([houseId])).toArray()).toEqual([[id1]]);

        await index.sync({id: id1, houseId}, undefined);
        expect(await toStream(index.get([houseId])).toArray()).toEqual([]);
    });

    it('should handle null and undefined values in compound indexes', async () => {
        const {tx} = await getTxn();
        const index = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId, x.name],
            unique: false,
            indexName: INDEX_NAME,
        });

        const id1 = createUuid();
        const id2 = createUuid();

        await index.sync(undefined, {
            id: id1,
            houseId: null,
            name: undefined,
        });
        await index.sync(undefined, {
            id: id2,
            houseId: undefined,
            name: 'Alice',
        });

        expect(
            await toStream(index.query({gte: [null, null]})).toArray()
        ).toEqual([[id1]]);
        expect(
            await toStream(index.query({gte: [undefined, null]})).toArray()
        ).toEqual([[id2]]);
    });

    it('should handle Uint8Array values', async () => {
        const {tx} = await getTxn();
        const index = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.avatar],
            unique: false,
            indexName: INDEX_NAME,
        });

        const id1 = createUuid();
        const avatar = new Uint8Array([1, 2, 3]);

        await index.sync(undefined, {id: id1, avatar});
        expect(await toStream(index.get([avatar])).toArray()).toEqual([[id1]]);
        expect(
            await toStream(index.get([new Uint8Array([3, 2, 1])])).toArray()
        ).toEqual([]);
    });

    it('should validate id consistency between previous and next values', async () => {
        const {tx} = await getTxn();
        const index = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
            indexName: INDEX_NAME,
        });

        const id1 = createUuid();
        const id2 = createUuid();

        await expect(
            index.sync({id: id1, houseId: null}, {id: id2, houseId: null})
        ).rejects.toThrow('invalid index sync: changing id is not allowed');
    });
});

describe('KeySerializer', () => {
    interface Testcase {
        name: string;
        a: any;
        b: any;
        result: -1 | 0 | 1;
    }

    const testcases: Testcase[] = [
        {name: '"a" < "b"', a: ['a'], b: ['b'], result: -1},
        {name: '"ab" < "b"', a: ['ab'], b: ['b'], result: -1},
        {name: '[1, 2] < [2, 0]', a: [1, 2], b: [2, 0], result: -1},
        {name: '[1, 2] > [1, null]', a: [1, 2], b: [1, null], result: 1},
        {
            name: '[1, undefined] > [1, 2]',
            a: [1, undefined],
            b: [1, 2],
            result: 1,
        },
        {
            name: '[1, undefined] > [1, 2, 3]',
            a: [1, undefined],
            b: [1, 2, 3],
            result: 1,
        },
        {name: '[1, 2] < [2]', a: [1, 2], b: [2], result: -1},
        {name: '[1, 2, 3] > [1, 2]', a: [1, 2, 3], b: [1, 2], result: 1},
        {name: '[1, 2, 3] < [2, 2]', a: [1, 2, 3], b: [2, 2], result: -1},
        {
            name: 'buf[1, 2, 3] < buf[2, 2]',
            a: [new Uint8Array([1, 2, 3])],
            b: [new Uint8Array([2, 2])],
            result: -1,
        },
    ];

    testcases.forEach(({a, b, name, result}) => {
        it(name, () => {
            expect(
                compareUint8Array(encodeIndexKey(a), encodeIndexKey(b))
            ).toEqual(result);
        });
    });

    it('should ser/de uuid', () => {
        const uuid = [createUuid()];
        const buf = encodeIndexKey(uuid);
        const result = decodeIndexKey(buf);

        expect(uuid).toEqual(result);
    });
});

describe('partial indexes', async () => {
    it('should only index items passing the filter function', async () => {
        const {tx} = await getTxn();
        const partialIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
            indexName: INDEX_NAME,
            filter: x => (x.age ?? -1) > 20,
        });

        const id1 = createUuid();
        const id2 = createUuid();
        const id3 = createUuid();
        const id4 = createUuid();

        await partialIndex.sync(undefined, {
            id: id1,
            houseId: null,
            age: 25,
        });
        await partialIndex.sync(undefined, {
            id: id2,
            houseId: null,
            age: 20,
        });
        await partialIndex.sync(undefined, {
            id: id3,
            houseId: null,
            age: undefined,
        });
        await partialIndex.sync(undefined, {
            id: id4,
            houseId: null,
            age: null,
        });

        const result = await toStream(
            partialIndex.query({gte: [null]})
        ).toArray();
        expect(result).toEqual([[id1]]); // Only id1 has age > 20
    });

    it('should remove items from index if filter function no longer applies', async () => {
        const {tx} = await getTxn();
        const partialIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
            indexName: INDEX_NAME,
            filter: x => (x.age ?? -1) > 20,
        });

        const id1 = createUuid();
        const id2 = createUuid();

        await partialIndex.sync(undefined, {
            id: id1,
            houseId: null,
            age: 25,
        });
        await partialIndex.sync(undefined, {
            id: id2,
            houseId: null,
            age: 30,
        });
        await partialIndex.sync(
            {id: id1, houseId: null, age: 25},
            {id: id1, houseId: null, age: 18}
        );

        const result = await toStream(
            partialIndex.query({gte: [null]})
        ).toArray();
        expect(result).toEqual([[id2]]); // id1 is removed after age changed to 18
    });

    it('should support dynamic filter function', async () => {
        const {tx} = await getTxn();
        const dynamicPartialIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
            indexName: INDEX_NAME,
            filter: x => x.ready === true,
        });

        const id1 = createUuid();
        const id2 = createUuid();

        await dynamicPartialIndex.sync(undefined, {
            id: id1,
            houseId: null,
            ready: true,
        });
        await dynamicPartialIndex.sync(undefined, {
            id: id2,
            houseId: null,
            ready: false,
        });

        let result = await toStream(
            dynamicPartialIndex.query({gte: [null]})
        ).toArray();
        expect(result).toEqual([[id1]]); // Only id1 is indexed initially

        // Change ready status
        await dynamicPartialIndex.sync(
            {id: id2, houseId: null, ready: false},
            {id: id2, houseId: null, ready: true}
        );

        result = await toStream(
            dynamicPartialIndex.query({gte: [null]})
        ).toArray();
        expect(result).toEqual([[id1], [id2]]); // Now id2 is included
    });

    it('should enforce unique constraint for included items', async () => {
        const {tx} = await getTxn();
        const uniquePartialIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: true,
            indexName: INDEX_NAME,
            filter: x => (x.age ?? -1) > 20,
        });

        const id1 = createUuid();
        const id2 = createUuid();
        const id3 = createUuid();
        const houseId = createUuid();

        await uniquePartialIndex.sync(undefined, {
            id: id1,
            houseId,
            age: 25,
        });
        await uniquePartialIndex.sync(undefined, {
            id: id2,
            houseId,
            age: 15,
        });

        // Attempt to add another item with the same key that satisfies the filter function
        await expect(
            uniquePartialIndex.sync(undefined, {id: id3, houseId, age: 30})
        ).rejects.toThrow(
            'Unique index constraint violation. Index name: some_index_name'
        );
    });

    it('should allow multiple items with the same key if excluded by filter function', async () => {
        const {tx} = await getTxn();
        const uniquePartialIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: true,
            indexName: INDEX_NAME,
            filter: x => (x.age ?? -1) > 20,
        });

        const id1 = createUuid();
        const id2 = createUuid();
        const houseId = createUuid();

        await uniquePartialIndex.sync(undefined, {
            id: id1,
            houseId,
            age: 25,
        }); // Included
        await uniquePartialIndex.sync(undefined, {
            id: id2,
            houseId,
            age: 20,
        }); // Excluded

        const result = await toStream(
            uniquePartialIndex.query({gte: [null]})
        ).toArray();
        expect(result).toEqual([[id1]]); // Only id1 is indexed
    });

    it('should handle updates where include condition changes dynamically', async () => {
        const {tx} = await getTxn();
        const uniquePartialIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: true,
            indexName: INDEX_NAME,
            filter: x => x.ready === true,
        });

        const id1 = createUuid();
        const id2 = createUuid();
        const houseId = createUuid();

        await uniquePartialIndex.sync(undefined, {
            id: id1,
            houseId,
            ready: true,
        }); // Included

        // Try adding another item with the same key
        await expect(
            uniquePartialIndex.sync(undefined, {
                id: id2,
                houseId,
                ready: true,
            })
        ).rejects.toThrow(
            'Unique index constraint violation. Index name: some_index_name'
        );

        // Update id1 to no longer be included
        await uniquePartialIndex.sync(
            {id: id1, houseId, ready: true},
            {id: id1, houseId, ready: false}
        );

        // Now id2 should be allowed
        await uniquePartialIndex.sync(undefined, {
            id: id2,
            houseId,
            ready: true,
        });

        const result = await toStream(
            uniquePartialIndex.query({gte: [null]})
        ).toArray();
        expect(result).toEqual([[id2]]); // Only id2 is indexed after id1 is excluded
    });

    it('should delete excluded items from unique index', async () => {
        const {tx} = await getTxn();
        const uniquePartialIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: true,
            indexName: INDEX_NAME,
            filter: x => (x.age ?? -1) > 20,
        });

        const id1 = createUuid();
        const houseId = createUuid();

        await uniquePartialIndex.sync(undefined, {
            id: id1,
            houseId,
            age: 25,
        }); // Included

        // Update id1 to be excluded
        await uniquePartialIndex.sync(
            {id: id1, houseId, age: 25},
            {id: id1, houseId, age: 18}
        ); // Excluded

        const result = await toStream(
            uniquePartialIndex.query({gte: [null]})
        ).toArray();
        expect(result).toEqual([]); // id1 is removed from the index
    });

    it('should re-add items if they satisfy the filter condition again', async () => {
        const {tx} = await getTxn();
        const uniquePartialIndex = createIndex<TestUser>({
            tx,
            idSelector,
            keySelector: x => [x.houseId],
            unique: true,
            indexName: INDEX_NAME,
            filter: x => (x.age ?? -1) > 20,
        });

        const id1 = createUuid();
        const houseId = createUuid();

        await uniquePartialIndex.sync(undefined, {
            id: id1,
            houseId,
            age: 25,
        }); // Included
        await uniquePartialIndex.sync(
            {id: id1, houseId, age: 25},
            {id: id1, houseId, age: 18}
        ); // Excluded
        await uniquePartialIndex.sync(
            {id: id1, houseId, age: 18},
            {id: id1, houseId, age: 30}
        ); // Re-added

        const result = await toStream(
            uniquePartialIndex.query({gte: [null]})
        ).toArray();
        expect(result).toEqual([[id1]]); // id1 is re-added after satisfying the condition again
    });
});
