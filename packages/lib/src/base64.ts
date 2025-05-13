import {Type} from '@sinclair/typebox';
import type {Brand} from './utils.js';

export type Base64 = Brand<string, 'Base64'>;

export function decodeBase64(data: Uint8Array): Base64 {
    return Buffer.from(data).toString('base64') as Base64;
}

export function encodeBase64(data: Base64): Uint8Array {
    return new Uint8Array(Buffer.from(data, 'base64'));
}

export function Base64() {
    return Type.Unsafe<Base64>(Type.String({format: 'base64'}));
}

const base64Regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

export function validateBase64(base64: unknown): boolean {
    return typeof base64 === 'string' && base64Regex.test(base64);
}
