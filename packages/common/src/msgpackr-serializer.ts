import {decode, encode} from 'msgpackr';
import {Serializer} from './serializer';

export class MsgpackrSerializer implements Serializer<any, Uint8Array> {
    encode(data: any): Uint8Array {
        return encode(data);
    }

    decode(buf: Uint8Array): any {
        return decode(buf);
    }
}
