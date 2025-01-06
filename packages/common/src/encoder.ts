import {addExtension, decode, encode} from 'msgpackr';
import {Uuid, UuidEncoder} from './uuid';

export interface Encoder<TData> {
    encode(data: TData): Uint8Array;
    decode(buf: Uint8Array): TData;
}

const uuidEncoder = new UuidEncoder();

addExtension({
    Class: Uuid,
    type: 1,
    write(instance: Uuid) {
        return uuidEncoder.encode(instance);
    },
    read(data: Uint8Array) {
        return uuidEncoder.decode(data);
    },
});

export class MsgpackrEncoder implements Encoder<any> {
    encode(data: any): Uint8Array {
        return encode(data);
    }

    decode(buf: Uint8Array): any {
        return decode(buf);
    }
}

export class StringEncoder implements Encoder<string> {
    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    encode(data: string): Uint8Array<ArrayBufferLike> {
        return this.encoder.encode(data);
    }

    decode(buf: Uint8Array<ArrayBufferLike>): string {
        return this.decoder.decode(buf);
    }
}
