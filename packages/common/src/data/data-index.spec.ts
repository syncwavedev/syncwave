import {describe, expect, it} from 'vitest';
import {InMemoryKeyValueStore} from '../kv/in-memory/in-memory-key-value-store';
import {withPrefix} from '../kv/kv-store';
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
    const txn = await new InMemoryKeyValueStore().transaction(async x => x);
    await txn.put(Buffer.from('aaa/'), new Uint8Array());
    await txn.put(Buffer.from('kkk/'), new Uint8Array());
    await txn.put(Buffer.from('zzz/'), new Uint8Array());

    return txn;
}

describe('data-index', async () => {
    async function getHouseIndex() {
        const txn = await getTxn();
        const houseIndex = createIndex<TestUser>({
            txn: withPrefix('house/')(txn),
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
        });

        return houseIndex;
    }

    describe('uuid', () => {
        it('should insert/update/delete doc', async () => {
            const houseIndex = await getHouseIndex();
            const id1 = createUuid();
            const id2 = createUuid();
            const id3 = createUuid();
            await houseIndex.sync(undefined, {id: id1, houseId: null});
            await houseIndex.sync(undefined, {id: id2, houseId: createUuid()});
            await houseIndex.sync(undefined, {id: id3});

            expect(await toArrayAsync(houseIndex.query({gte: [null]}))).toEqual([id1, id2, id3]);

            expect(await toArrayAsync(houseIndex.get([null]))).toEqual([id1]);

            await houseIndex.sync({id: id1, houseId: null}, {id: id1});
        });
    });

    // describe('number');
    // describe('boolean');
    // describe('string');
    // describe('null');
    // describe('undefined');
    // describe('Uint8Array');

    // describe('houseId ready age');
});
