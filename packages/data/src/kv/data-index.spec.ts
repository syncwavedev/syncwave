import {describe, expect, it} from 'vitest';
import {astream} from '../async-stream.js';
import {Cx} from '../context.js';
import {compareUint8Array} from '../utils.js';
import {Uuid, createUuid} from '../uuid.js';
import {IndexKeyCodec, createIndex} from './data-index.js';
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
const cx = Cx.test();

const idSelector = (x: TestUser) => x.id;

async function getTxn() {
    const store = new MemKVStore();
    const tx = await store.transact(cx, async (cx, tx) => tx);

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
        await houseIndex.sync(cx, undefined, {id: id1, houseId: null});
        await houseIndex.sync(cx, undefined, {id: id2, houseId: createUuid()});
        await houseIndex.sync(cx, undefined, {id: id3});

        expect(
            await astream(houseIndex.query(cx, {gte: [null]})).toArray(cx)
        ).toEqual([id1, id2, id3]);
        expect(await astream(houseIndex.get(cx, [null])).toArray(cx)).toEqual([
            id1,
        ]);

        await houseIndex.sync(cx, {id: id1, houseId: null}, {id: id1});

        // houseId is undefined, so id1 goes after id2
        expect(
            await astream(houseIndex.query(cx, {gte: [null]})).toArray(cx)
        ).toEqual([id2, id1, id3]);
        expect(await astream(houseIndex.get(cx, [null])).toArray(cx)).toEqual(
            []
        );

        await houseIndex.sync(cx, {id: id1}, {id: id1, houseId: null});
        await houseIndex.sync(cx, {id: id3}, undefined);

        expect(
            await astream(houseIndex.query(cx, {gte: [null]})).toArray(cx)
        ).toEqual([id1, id2]);
        expect(await astream(houseIndex.get(cx, [null])).toArray(cx)).toEqual([
            id1,
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

        await uniqueIndex.sync(cx, undefined, {id: id1, houseId});
        await expect(
            uniqueIndex.sync(cx, undefined, {id: createUuid(), houseId})
        ).rejects.toThrow('unique index constraint violation');
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
        await index.sync(cx, undefined, {id: id1, houseId: undefined});
        await index.sync(cx, undefined, {id: id2, houseId: null});

        expect(
            await astream(index.query(cx, {gte: [null]})).toArray(cx)
        ).toEqual([id2, id1]);
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

        await compoundIndex.sync(cx, undefined, {
            id: id1,
            houseId: houseId1,
            age: 25,
        });
        await compoundIndex.sync(cx, undefined, {
            id: id2,
            houseId: houseId1,
            age: 30,
        });
        await compoundIndex.sync(cx, undefined, {
            id: id3,
            houseId: houseId1,
            age: 30,
        });
        await compoundIndex.sync(cx, undefined, {
            id: id4,
            houseId: houseId1,
            age: 35,
        });
        await compoundIndex.sync(cx, undefined, {
            id: id5,
            houseId: houseId2,
            age: 35,
        });

        expect(
            await astream(
                compoundIndex.query(cx, {gte: [houseId1, null]})
            ).toArray(cx)
        ).toEqual([id1, id2, id3, id4]);
        expect(
            await astream(
                compoundIndex.query(cx, {gte: [houseId1, 25]})
            ).toArray(cx)
        ).toEqual([id1, id2, id3, id4]);
        expect(
            await astream(
                compoundIndex.query(cx, {gt: [houseId1, 25]})
            ).toArray(cx)
        ).toEqual([id2, id3, id4]);
        expect(
            await astream(
                compoundIndex.query(cx, {gt: [houseId1, 30]})
            ).toArray(cx)
        ).toEqual([id4]);
        expect(
            await astream(
                compoundIndex.query(cx, {gt: [houseId1, 35]})
            ).toArray(cx)
        ).toEqual([]);
        expect(
            await astream(
                compoundIndex.query(cx, {gte: [houseId1, undefined]})
            ).toArray(cx)
        ).toEqual([]);

        expect(
            await astream(
                compoundIndex.query(cx, {lte: [houseId1, undefined]})
            ).toArray(cx)
        ).toEqual([id4, id3, id2, id1]);
        expect(
            await astream(
                compoundIndex.query(cx, {lt: [houseId1, undefined]})
            ).toArray(cx)
        ).toEqual([id4, id3, id2, id1]);
        expect(
            await astream(
                compoundIndex.query(cx, {lte: [houseId1, 36]})
            ).toArray(cx)
        ).toEqual([id4, id3, id2, id1]);
        expect(
            await astream(
                compoundIndex.query(cx, {lte: [houseId1, 35]})
            ).toArray(cx)
        ).toEqual([id4, id3, id2, id1]);
        expect(
            await astream(
                compoundIndex.query(cx, {lt: [houseId1, 35]})
            ).toArray(cx)
        ).toEqual([id3, id2, id1]);
        expect(
            await astream(
                compoundIndex.query(cx, {lt: [houseId1, 30]})
            ).toArray(cx)
        ).toEqual([id1]);
        expect(
            await astream(
                compoundIndex.query(cx, {lt: [houseId1, 10]})
            ).toArray(cx)
        ).toEqual([]);
        expect(
            await astream(
                compoundIndex.query(cx, {lte: [houseId1, null]})
            ).toArray(cx)
        ).toEqual([]);

        expect(
            await astream(compoundIndex.query(cx, {gte: [null]})).toArray(cx)
        ).toEqual([id1, id2, id3, id4, id5]);
        expect(
            await astream(compoundIndex.query(cx, {gt: [null]})).toArray(cx)
        ).toEqual([id1, id2, id3, id4, id5]);
        expect(
            await astream(compoundIndex.query(cx, {gte: [houseId1]})).toArray(
                cx
            )
        ).toEqual([id1, id2, id3, id4, id5]);
        expect(
            await astream(compoundIndex.query(cx, {gt: [houseId1]})).toArray(cx)
        ).toEqual([id5]);
        expect(
            await astream(compoundIndex.query(cx, {gte: [houseId2]})).toArray(
                cx
            )
        ).toEqual([id5]);
        expect(
            await astream(compoundIndex.query(cx, {gt: [houseId2]})).toArray(cx)
        ).toEqual([]);
        expect(
            await astream(compoundIndex.query(cx, {gte: [undefined]})).toArray(
                cx
            )
        ).toEqual([]);
        expect(
            await astream(compoundIndex.query(cx, {gt: [undefined]})).toArray(
                cx
            )
        ).toEqual([]);

        expect(
            await astream(compoundIndex.query(cx, {lte: [undefined]})).toArray(
                cx
            )
        ).toEqual([id5, id4, id3, id2, id1]);
        expect(
            await astream(compoundIndex.query(cx, {lt: [undefined]})).toArray(
                cx
            )
        ).toEqual([id5, id4, id3, id2, id1]);
        expect(
            await astream(compoundIndex.query(cx, {lte: [houseId2]})).toArray(
                cx
            )
        ).toEqual([id5, id4, id3, id2, id1]);
        expect(
            await astream(compoundIndex.query(cx, {lt: [houseId2]})).toArray(cx)
        ).toEqual([id4, id3, id2, id1]);
        expect(
            await astream(compoundIndex.query(cx, {lte: [houseId1]})).toArray(
                cx
            )
        ).toEqual([id4, id3, id2, id1]);
        expect(
            await astream(compoundIndex.query(cx, {lt: [houseId1]})).toArray(cx)
        ).toEqual([]);
        expect(
            await astream(compoundIndex.query(cx, {lte: [null]})).toArray(cx)
        ).toEqual([]);
        expect(
            await astream(compoundIndex.query(cx, {lt: [null]})).toArray(cx)
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

        await index.sync(cx, undefined, {id: id1, houseId});
        expect(await astream(index.get(cx, [houseId])).toArray(cx)).toEqual([
            id1,
        ]);

        await index.sync(cx, {id: id1, houseId}, undefined);
        expect(await astream(index.get(cx, [houseId])).toArray(cx)).toEqual([]);
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

        await index.sync(cx, undefined, {
            id: id1,
            houseId: null,
            name: undefined,
        });
        await index.sync(cx, undefined, {
            id: id2,
            houseId: undefined,
            name: 'Alice',
        });

        expect(
            await astream(index.query(cx, {gte: [null, null]})).toArray(cx)
        ).toEqual([id1]);
        expect(
            await astream(index.query(cx, {gte: [undefined, null]})).toArray(cx)
        ).toEqual([id2]);
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

        await index.sync(cx, undefined, {id: id1, avatar});
        expect(await astream(index.get(cx, [avatar])).toArray(cx)).toEqual([
            id1,
        ]);
        expect(
            await astream(index.get(cx, [new Uint8Array([3, 2, 1])])).toArray(
                cx
            )
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
            index.sync(cx, {id: id1, houseId: null}, {id: id2, houseId: null})
        ).rejects.toThrow('invalid index sync: changing id is not allowed');
    });
});

describe('KeySerializer', () => {
    const serializer = new IndexKeyCodec();

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
                compareUint8Array(serializer.encode(a), serializer.encode(b))
            ).toEqual(result);
        });
    });

    it('should ser/de uuid', () => {
        const uuid = [createUuid()];
        const buf = serializer.encode(uuid);
        const result = serializer.decode(buf);

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

        await partialIndex.sync(cx, undefined, {
            id: id1,
            houseId: null,
            age: 25,
        });
        await partialIndex.sync(cx, undefined, {
            id: id2,
            houseId: null,
            age: 20,
        });
        await partialIndex.sync(cx, undefined, {
            id: id3,
            houseId: null,
            age: undefined,
        });
        await partialIndex.sync(cx, undefined, {
            id: id4,
            houseId: null,
            age: null,
        });

        const result = await astream(
            partialIndex.query(cx, {gte: [null]})
        ).toArray(cx);
        expect(result).toEqual([id1]); // Only id1 has age > 20
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

        await partialIndex.sync(cx, undefined, {
            id: id1,
            houseId: null,
            age: 25,
        });
        await partialIndex.sync(cx, undefined, {
            id: id2,
            houseId: null,
            age: 30,
        });
        await partialIndex.sync(
            cx,
            {id: id1, houseId: null, age: 25},
            {id: id1, houseId: null, age: 18}
        );

        const result = await astream(
            partialIndex.query(cx, {gte: [null]})
        ).toArray(cx);
        expect(result).toEqual([id2]); // id1 is removed after age changed to 18
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

        await dynamicPartialIndex.sync(cx, undefined, {
            id: id1,
            houseId: null,
            ready: true,
        });
        await dynamicPartialIndex.sync(cx, undefined, {
            id: id2,
            houseId: null,
            ready: false,
        });

        let result = await astream(
            dynamicPartialIndex.query(cx, {gte: [null]})
        ).toArray(cx);
        expect(result).toEqual([id1]); // Only id1 is indexed initially

        // Change ready status
        await dynamicPartialIndex.sync(
            cx,
            {id: id2, houseId: null, ready: false},
            {id: id2, houseId: null, ready: true}
        );

        result = await astream(
            dynamicPartialIndex.query(cx, {gte: [null]})
        ).toArray(cx);
        expect(result).toEqual([id1, id2]); // Now id2 is included
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

        await uniquePartialIndex.sync(cx, undefined, {
            id: id1,
            houseId,
            age: 25,
        });
        await uniquePartialIndex.sync(cx, undefined, {
            id: id2,
            houseId,
            age: 15,
        });

        // Attempt to add another item with the same key that satisfies the filter function
        await expect(
            uniquePartialIndex.sync(cx, undefined, {id: id3, houseId, age: 30})
        ).rejects.toThrow('unique index constraint violation');
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

        await uniquePartialIndex.sync(cx, undefined, {
            id: id1,
            houseId,
            age: 25,
        }); // Included
        await uniquePartialIndex.sync(cx, undefined, {
            id: id2,
            houseId,
            age: 20,
        }); // Excluded

        const result = await astream(
            uniquePartialIndex.query(cx, {gte: [null]})
        ).toArray(cx);
        expect(result).toEqual([id1]); // Only id1 is indexed
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

        await uniquePartialIndex.sync(cx, undefined, {
            id: id1,
            houseId,
            ready: true,
        }); // Included

        // Try adding another item with the same key
        await expect(
            uniquePartialIndex.sync(cx, undefined, {
                id: id2,
                houseId,
                ready: true,
            })
        ).rejects.toThrow('unique index constraint violation');

        // Update id1 to no longer be included
        await uniquePartialIndex.sync(
            cx,
            {id: id1, houseId, ready: true},
            {id: id1, houseId, ready: false}
        );

        // Now id2 should be allowed
        await uniquePartialIndex.sync(cx, undefined, {
            id: id2,
            houseId,
            ready: true,
        });

        const result = await astream(
            uniquePartialIndex.query(cx, {gte: [null]})
        ).toArray(cx);
        expect(result).toEqual([id2]); // Only id2 is indexed after id1 is excluded
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

        await uniquePartialIndex.sync(cx, undefined, {
            id: id1,
            houseId,
            age: 25,
        }); // Included

        // Update id1 to be excluded
        await uniquePartialIndex.sync(
            cx,
            {id: id1, houseId, age: 25},
            {id: id1, houseId, age: 18}
        ); // Excluded

        const result = await astream(
            uniquePartialIndex.query(cx, {gte: [null]})
        ).toArray(cx);
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

        await uniquePartialIndex.sync(cx, undefined, {
            id: id1,
            houseId,
            age: 25,
        }); // Included
        await uniquePartialIndex.sync(
            cx,
            {id: id1, houseId, age: 25},
            {id: id1, houseId, age: 18}
        ); // Excluded
        await uniquePartialIndex.sync(
            cx,
            {id: id1, houseId, age: 18},
            {id: id1, houseId, age: 30}
        ); // Re-added

        const result = await astream(
            uniquePartialIndex.query(cx, {gte: [null]})
        ).toArray(cx);
        expect(result).toEqual([id1]); // id1 is re-added after satisfying the condition again
    });
});
