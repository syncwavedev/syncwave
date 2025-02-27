import {decode, encode} from 'msgpackr';

export interface Codec<TData> {
    encode(data: TData): Uint8Array;
    decode(buf: Uint8Array): TData;
}

export class MsgpackCodec<T = unknown> implements Codec<T> {
    encode(data: T): Uint8Array {
        return encodeMsgpack(data);
    }

    decode(buf: Uint8Array): T {
        return decodeMsgpack(buf) as T;
    }
}

export const encodeMsgpack = (data: unknown) => encode(data);
export const decodeMsgpack = (buf: Uint8Array) => decode(buf) as unknown;

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

const stringCodec = new StringCodec();
export const encodeString = (data: string) => stringCodec.encode(data);
export const decodeString = (buf: Uint8Array) => stringCodec.decode(buf);

export class NumberCodec implements Codec<number> {
    encode(data: number): Uint8Array {
        return new Uint8Array(encode(data));
    }
    decode(buf: Uint8Array): number {
        return decode(Buffer.from(buf));
    }
}

const numberCodec = new NumberCodec();
export const encodeNumber = (data: number) => numberCodec.encode(data);
export const decodeNumber = (buf: Uint8Array) => numberCodec.decode(buf);
