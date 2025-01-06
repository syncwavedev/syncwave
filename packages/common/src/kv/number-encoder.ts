import {decode, encode} from 'bytewise';
import {Encoder} from '../encoder';

export class NumberEncoder implements Encoder<number> {
    encode(data: number): Uint8Array {
        return new Uint8Array(encode(data));
    }
    decode(buf: Uint8Array): number {
        return decode(Buffer.from(buf));
    }
}
