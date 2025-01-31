import {decode, encode} from 'msgpackr';
import {Cx} from './context.js';

export interface Codec<TData> {
    encode(cx: Cx, data: TData): Uint8Array;
    decode(cx: Cx, buf: Uint8Array): TData;
}

export class MsgpackCodec implements Codec<any> {
    encode(cx: Cx, data: any): Uint8Array {
        return encode(data);
    }

    decode(cx: Cx, buf: Uint8Array): any {
        return decode(buf);
    }
}

export class StringCodec implements Codec<string> {
    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    encode(cx: Cx, data: string): Uint8Array {
        return this.encoder.encode(data);
    }

    decode(cx: Cx, buf: Uint8Array): string {
        return this.decoder.decode(buf);
    }
}

const stringCodec = new StringCodec();
export const encodeString = (cx: Cx, data: string) =>
    stringCodec.encode(cx, data);
export const decodeString = (cx: Cx, buf: Uint8Array) =>
    stringCodec.decode(cx, buf);

export class NumberCodec implements Codec<number> {
    encode(cx: Cx, data: number): Uint8Array {
        return new Uint8Array(encode(data));
    }
    decode(cx: Cx, buf: Uint8Array): number {
        return decode(Buffer.from(buf));
    }
}

const numberCodec = new NumberCodec();
export const encodeNumber = (cx: Cx, data: number) =>
    numberCodec.encode(cx, data);
export const decodeNumber = (cx: Cx, buf: Uint8Array) =>
    numberCodec.decode(cx, buf);
