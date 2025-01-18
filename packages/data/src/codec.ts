import {addExtension, decode, encode} from 'msgpackr';
import {Uuid, UuidCodec} from './uuid.js';

export interface Codec<TData> {
    encode(data: TData): Uint8Array;
    decode(buf: Uint8Array): TData;
}

const uuidCodec = new UuidCodec();

addExtension({
    Class: Uuid,
    type: 1,
    write(instance: Uuid) {
        return uuidCodec.encode(instance);
    },
    read(data: Uint8Array) {
        return uuidCodec.decode(data);
    },
});

export class MsgpackrCodec implements Codec<any> {
    encode(data: any): Uint8Array {
        return encode(data);
    }

    decode(buf: Uint8Array): any {
        return decode(buf);
    }
}

export class StringCodec implements Codec<string> {
    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    encode(data: string): Uint8Array {
        return this.encoder.encode(data);
    }

    decode(buf: Uint8Array): string {
        return this.decoder.decode(buf);
    }
}

export class NumberCodec implements Codec<number> {
    encode(data: number): Uint8Array {
        return new Uint8Array(encode(data));
    }
    decode(buf: Uint8Array): number {
        return decode(Buffer.from(buf));
    }
}
