import {addExtension, decode, encode} from 'msgpackr';
import {Serializer} from './serializer';
import {Uuid, UuidSerializer} from './uuid';

const uuidSerializer = new UuidSerializer();

addExtension({
    Class: Uuid,
    type: 1,
    pack(instance: Uuid) {
        return uuidSerializer.encode(instance);
    },
    unpack(buf) {
        return uuidSerializer.decode(buf);
    },
});

export class MsgpackrSerializer implements Serializer<unknown, Uint8Array> {
    encode(data: unknown): Uint8Array {
        return encode(data);
    }

    decode(encoding: Uint8Array): unknown {
        return decode(encoding);
    }
}
