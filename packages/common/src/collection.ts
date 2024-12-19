import {KVStore} from './contracts/key-value-store';
import {withKeySerializer, withPrefix, withValueSerializer} from './kv-store-utils';
import {MsgpackrSerializer} from './msgpackr-serializer';
import {pipe} from './utils';
import {Uuid, UuidSerializer} from './uuid';

export class Collection {
    private documents: KVStore<Uuid, unknown>;

    constructor(kvStore: KVStore<Uint8Array, Uint8Array>) {
        this.documents = pipe(
            kvStore,
            withPrefix('d/'),
            withKeySerializer(new UuidSerializer()),
            withValueSerializer(new MsgpackrSerializer())
        );
    }
}
