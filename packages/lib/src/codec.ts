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
