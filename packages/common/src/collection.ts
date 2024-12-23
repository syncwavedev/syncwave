import {Doc} from 'yjs';
import {KVStore} from './contracts/key-value-store';
import {withKeySerializer, withPrefix, withValueSerializer} from './kv-store-utils';
import {pipe} from './utils';
import {Uuid, UuidSerializer} from './uuid';
import {YjsSerializer} from './yjs-serializer';

export class Collection {
    private documents: KVStore<Uuid, Doc>;

    constructor(kvStore: KVStore<Uint8Array, Uint8Array>) {
        this.documents = pipe(
            kvStore,
            withPrefix('d/'),
            withKeySerializer(new UuidSerializer()),
            withValueSerializer(new YjsSerializer())
        );
    }
}
