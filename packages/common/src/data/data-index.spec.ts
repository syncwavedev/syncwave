import {describe, expect, it} from 'vitest';
import {InMemoryKeyValueStore} from '../kv/in-memory/in-memory-key-value-store';
import {toArrayAsync} from '../utils';
import {Uuid, createUuid} from '../uuid';
import {createIndex} from './data-index';

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

const idSelector = (x: TestUser) => x.id;

async function getTxn() {
    const store = new InMemoryKeyValueStore();
    const txn = await store.transaction(async x => x);

    return {store, txn};
}

describe('data-index', async () => {
    it('should insert/update/delete doc', async () => {
        const {txn} = await getTxn();
        const houseIndex = createIndex<TestUser>({
            txn,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
        });
        const id1 = createUuid();
        const id2 = createUuid();
        const id3 = createUuid();
        await houseIndex.sync(undefined, {id: id1, houseId: null});
        await houseIndex.sync(undefined, {id: id2, houseId: createUuid()});
        await houseIndex.sync(undefined, {id: id3});

        expect(await toArrayAsync(houseIndex.query({gte: [null]}))).toEqual([id1, id2, id3]);
        expect(await toArrayAsync(houseIndex.get([null]))).toEqual([id1]);

        await houseIndex.sync({id: id1, houseId: null}, {id: id1});

        // houseId is undefined, so id1 goes after id2
        expect(await toArrayAsync(houseIndex.query({gte: [null]}))).toEqual([id2, id1, id3]);
        expect(await toArrayAsync(houseIndex.get([null]))).toEqual([]);

        await houseIndex.sync({id: id1}, {id: id1, houseId: null});
        await houseIndex.sync({id: id3}, undefined);

        expect(await toArrayAsync(houseIndex.query({gte: [null]}))).toEqual([id1, id2]);
        expect(await toArrayAsync(houseIndex.get([null]))).toEqual([id1]);
    });

    it('should enforce unique index constraint', async () => {
        const {txn} = await getTxn();
        const uniqueIndex = createIndex<TestUser>({
            txn,
            idSelector,
            keySelector: x => [x.houseId],
            unique: true,
        });

        const id1 = createUuid();
        const houseId = createUuid();

        await uniqueIndex.sync(undefined, {id: id1, houseId});
        await expect(uniqueIndex.sync(undefined, {id: createUuid(), houseId})).rejects.toThrow(
            'unique index constraint violation'
        );
    });

    it('should handle queries with undefined keys', async () => {
        const {txn} = await getTxn();
        const index = createIndex<TestUser>({
            txn,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
        });

        const id1 = createUuid();
        const id2 = createUuid();
        await index.sync(undefined, {id: id1, houseId: undefined});
        await index.sync(undefined, {id: id2, houseId: null});

        expect(await toArrayAsync(index.query({gte: [null]}))).toEqual([id2, id1]);
    });

    it('should support compound index queries', async () => {
        const {txn} = await getTxn();
        const compoundIndex = createIndex<TestUser>({
            txn,
            idSelector,
            keySelector: x => [x.houseId, x.age],
            unique: false,
        });

        const id1 = createUuid();
        const id2 = createUuid();
        const id3 = createUuid();
        const id4 = createUuid();
        const id5 = createUuid();
        const houseId1 = createUuid();
        const houseId2 = createUuid();

        await compoundIndex.sync(undefined, {id: id1, houseId: houseId1, age: 25});
        await compoundIndex.sync(undefined, {id: id2, houseId: houseId1, age: 30});
        await compoundIndex.sync(undefined, {id: id3, houseId: houseId1, age: 30});
        await compoundIndex.sync(undefined, {id: id4, houseId: houseId1, age: 35});
        await compoundIndex.sync(undefined, {id: id5, houseId: houseId2, age: 35});

        expect(await toArrayAsync(compoundIndex.query({gte: [houseId1, null]}))).toEqual([id1, id2, id3, id4]);
        expect(await toArrayAsync(compoundIndex.query({gte: [houseId1, 25]}))).toEqual([id1, id2, id3, id4]);
        expect(await toArrayAsync(compoundIndex.query({gt: [houseId1, 25]}))).toEqual([id2, id3, id4]);
        expect(await toArrayAsync(compoundIndex.query({gt: [houseId1, 30]}))).toEqual([id4]);
        expect(await toArrayAsync(compoundIndex.query({gt: [houseId1, 35]}))).toEqual([]);
        expect(await toArrayAsync(compoundIndex.query({gte: [houseId1, undefined]}))).toEqual([]);

        expect(await toArrayAsync(compoundIndex.query({lte: [houseId1, undefined]}))).toEqual([id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lt: [houseId1, undefined]}))).toEqual([id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lte: [houseId1, 36]}))).toEqual([id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lte: [houseId1, 35]}))).toEqual([id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lt: [houseId1, 35]}))).toEqual([id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lt: [houseId1, 30]}))).toEqual([id1]);
        expect(await toArrayAsync(compoundIndex.query({lt: [houseId1, 10]}))).toEqual([]);
        expect(await toArrayAsync(compoundIndex.query({lte: [houseId1, null]}))).toEqual([]);

        expect(await toArrayAsync(compoundIndex.query({gte: [null]}))).toEqual([id1, id2, id3, id4, id5]);
        expect(await toArrayAsync(compoundIndex.query({gt: [null]}))).toEqual([id1, id2, id3, id4, id5]);
        expect(await toArrayAsync(compoundIndex.query({gte: [houseId1]}))).toEqual([id1, id2, id3, id4, id5]);
        expect(await toArrayAsync(compoundIndex.query({gt: [houseId1]}))).toEqual([id5]);
        expect(await toArrayAsync(compoundIndex.query({gte: [houseId2]}))).toEqual([id5]);
        expect(await toArrayAsync(compoundIndex.query({gt: [houseId2]}))).toEqual([]);
        expect(await toArrayAsync(compoundIndex.query({gte: [undefined]}))).toEqual([]);
        expect(await toArrayAsync(compoundIndex.query({gt: [undefined]}))).toEqual([]);

        expect(await toArrayAsync(compoundIndex.query({lte: [undefined]}))).toEqual([id5, id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lt: [undefined]}))).toEqual([id5, id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lte: [houseId2]}))).toEqual([id5, id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lt: [houseId2]}))).toEqual([id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lte: [houseId1]}))).toEqual([id4, id3, id2, id1]);
        expect(await toArrayAsync(compoundIndex.query({lt: [houseId1]}))).toEqual([]);
        expect(await toArrayAsync(compoundIndex.query({lte: [null]}))).toEqual([]);
        expect(await toArrayAsync(compoundIndex.query({lt: [null]}))).toEqual([]);
    });

    it('should correctly delete entries', async () => {
        const {txn} = await getTxn();
        const index = createIndex<TestUser>({
            txn,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
        });

        const id1 = createUuid();
        const houseId = createUuid();

        await index.sync(undefined, {id: id1, houseId});
        expect(await toArrayAsync(index.get([houseId]))).toEqual([id1]);

        await index.sync({id: id1, houseId}, undefined);
        expect(await toArrayAsync(index.get([houseId]))).toEqual([]);
    });

    it('should handle null and undefined values in compound indexes', async () => {
        const {txn} = await getTxn();
        const index = createIndex<TestUser>({
            txn,
            idSelector,
            keySelector: x => [x.houseId, x.name],
            unique: false,
        });

        const id1 = createUuid();
        const id2 = createUuid();

        await index.sync(undefined, {id: id1, houseId: null, name: undefined});
        await index.sync(undefined, {id: id2, houseId: undefined, name: 'Alice'});

        expect(await toArrayAsync(index.query({gte: [null, null]}))).toEqual([id1]);
        expect(await toArrayAsync(index.query({gte: [undefined, null]}))).toEqual([id2]);
    });

    it('should handle Uint8Array values', async () => {
        const {txn} = await getTxn();
        const index = createIndex<TestUser>({
            txn,
            idSelector,
            keySelector: x => [x.avatar],
            unique: false,
        });

        const id1 = createUuid();
        const avatar = new Uint8Array([1, 2, 3]);

        await index.sync(undefined, {id: id1, avatar});
        expect(await toArrayAsync(index.get([avatar]))).toEqual([id1]);
        expect(await toArrayAsync(index.get([new Uint8Array([3, 2, 1])]))).toEqual([]);
    });

    it('should validate id consistency between previous and next values', async () => {
        const {txn} = await getTxn();
        const index = createIndex<TestUser>({
            txn,
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
        });

        const id1 = createUuid();
        const id2 = createUuid();

        await expect(index.sync({id: id1, houseId: null}, {id: id2, houseId: null})).rejects.toThrow(
            'invalid index sync: changing id is not allowed'
        );
    });
});
