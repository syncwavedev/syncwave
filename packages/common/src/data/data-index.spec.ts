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

describe('data-index', async () => {
    const store = new InMemoryKeyValueStore();
    const txn = await store.transaction(async x => x);
    const idSelector = (x: TestUser) => x.id;
    await txn.put(Buffer.from('aaa/'), new Uint8Array());
    await txn.put(Buffer.from('kkk/'), new Uint8Array());
    await txn.put(Buffer.from('zzz/'), new Uint8Array());

    describe('uuid', async () => {
        const houseIndex = createIndex<TestUser>({
            txn: withPrefix('house/')(txn),
            idSelector,
            keySelector: x => [x.houseId],
            unique: false,
        });

        it('should insert doc', async () => {
            const id1 = createUuid();
            const id2 = createUuid();
            const id3 = createUuid();
            await houseIndex.sync(undefined, {
                id: id1,
                houseId: null,
            });
            await houseIndex.sync(undefined, {
                id: id2,
                houseId: createUuid(),
            });
            await houseIndex.sync(undefined, {
                id: id3,
            });

            const queryResult = await toArrayAsync(houseIndex.query({gte: [null]}));
            expect(queryResult).toEqual([id1, id2, id3]);

            const getResult = await toArrayAsync(houseIndex.get([null]));
            expect(getResult).toEqual([id1]);
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
