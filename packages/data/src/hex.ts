import {Codec} from './codec.js';
import {Cx} from './context.js';
import {AppError} from './errors.js';

const hexRegex = /^([0-9a-fA-F]{2}( [0-9a-fA-F]{2})*)?$/;

export function validateHexString(hexString: unknown): boolean {
    return typeof hexString === 'string' && hexRegex.test(hexString);
}

export class HexCodec implements Codec<string> {
    encode(cx: Cx, hexString: string): Uint8Array {
        if (!validateHexString(hexString)) {
            throw new AppError(cx, 'Invalid hex string format: ' + hexString);
        }

        if (hexString === '') {
            return new Uint8Array();
        }

        return new Uint8Array(
            hexString.split(' ').map(hex => parseInt(hex, 16))
        );
    }

    decode(cx: Cx, buf: Uint8Array): string {
        const hexString = Array.from(buf)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join(' ');
        return hexString;
    }
}

const hexCodec = new HexCodec();
export const encodeHex = (cx: Cx, data: string) => hexCodec.encode(cx, data);
export const decodeHex = (cx: Cx, buf: Uint8Array) => hexCodec.decode(cx, buf);
