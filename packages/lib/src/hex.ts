import {type Codec} from './codec.js';
import {AppError} from './errors.js';

const hexRegex = /^([0-9a-fA-F]{2}( [0-9a-fA-F]{2})*)?$/;

export function validateHexString(hexString: unknown): boolean {
    return typeof hexString === 'string' && hexRegex.test(hexString);
}

export class HexCodec implements Codec<string> {
    encode(hexString: string): Uint8Array {
        if (!validateHexString(hexString)) {
            throw new AppError('Invalid hex string format: ' + hexString);
        }

        if (hexString === '') {
            return new Uint8Array();
        }

        return new Uint8Array(
            hexString.split(' ').map(hex => parseInt(hex, 16))
        );
    }

    decode(buf: Uint8Array): string {
        const hexString = Array.from(buf)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join(' ');
        return hexString;
    }
}

const hexCodec = new HexCodec();
export const encodeHex = (data: string) => hexCodec.encode(data);
export const decodeHex = (buf: Uint8Array) => hexCodec.decode(buf);
