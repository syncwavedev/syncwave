import {pack, unpack} from 'msgpackr';
import {Serializer} from './contracts/serializer';

export class MsgpackrSerializer implements Serializer<unknown, Uint8Array> {
    encode(data: unknown): Uint8Array {
        return pack(data);
    }

    decode(buffer: Uint8Array): unknown {
        return unpack(buffer);
    }
}
