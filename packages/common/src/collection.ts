import {applyUpdateV2, Doc, encodeStateAsUpdateV2} from 'yjs';
import {KVStore} from './contracts/key-value-store';
import {withKeySerializer, withValueSerializer} from './kv-store-utils';
import {pipe} from './utils';
import {createUuid, Uuid, UuidSerializer} from './uuid';
import {YjsSerializer} from './yjs-serializer';

export class DocNotFound extends Error {
    constructor() {
        super('document not found');
    }
}

export class Collection {
    private docs: KVStore<Uuid, Doc>;

    constructor(kvStore: KVStore<Uint8Array, Uint8Array>) {
        this.docs = pipe(kvStore, withKeySerializer(new UuidSerializer()), withValueSerializer(new YjsSerializer()));
    }

    async create(doc: Doc): Promise<void> {
        this.docs.put(createUuid(), doc);
    }

    async get(key: Uuid): Promise<Doc | undefined> {
        return await this.docs.get(key);
    }

    async update(key: Uuid, delta: Uint8Array): Promise<void> {
        await this.docs.transaction(async txn => {
            const doc = await txn.get(key);
            if (!doc) {
                throw new DocNotFound();
            }

            applyUpdateV2(doc, delta);
            await txn.put(key, doc);
        });
    }

    async put(key: Uuid, doc: Doc): Promise<Doc> {
        return await this.docs.transaction(async txn => {
            const newDoc = (await txn.get(key)) ?? new Doc();
            const state = encodeStateAsUpdateV2(doc);
            applyUpdateV2(newDoc, state);
            await txn.put(key, newDoc);

            return newDoc;
        });
    }
}
