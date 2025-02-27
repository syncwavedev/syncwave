import {Type} from '@sinclair/typebox';
import type {Codec} from './codec.js';
import type {Brand} from './utils.js';

export type Base64 = Brand<string, 'Base64'>;

export class Base64Codec implements Codec<Base64> {
    decode(data: Uint8Array): Base64 {
        return Buffer.from(data).toString('base64') as Base64;
    }

    encode(data: Base64): Uint8Array {
        return new Uint8Array(Buffer.from(data, 'base64'));
    }
}

const base64Codec = new Base64Codec();

export function decodeBase64(data: Uint8Array): Base64 {
    return base64Codec.decode(data);
}

export function encodeBase64(data: Base64): Uint8Array {
    return base64Codec.encode(data);
}

export function zBase64() {
    return Type.Unsafe<Base64>(
        Type.String({format: 'regex', pattern: base64Regex.source})
    );
}

const base64Regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

export function validateBase64(base64: unknown): boolean {
    return typeof base64 === 'string' && base64Regex.test(base64);
}
