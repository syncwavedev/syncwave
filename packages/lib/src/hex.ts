import {AppError} from './errors.js';

const hexRegex = /^([0-9a-fA-F]{2}( [0-9a-fA-F]{2})*)?$/;

export function validateHexString(hexString: unknown): boolean {
    return typeof hexString === 'string' && hexRegex.test(hexString);
}

export const encodeHex = (hexString: string) => {
    if (!validateHexString(hexString)) {
        throw new AppError('Invalid hex string format: ' + hexString);
    }

    if (hexString === '') {
        return new Uint8Array();
    }

    return new Uint8Array(hexString.split(' ').map(hex => parseInt(hex, 16)));
};
export const decodeHex = (buf: Uint8Array) => {
    const hexString = Array.from(buf)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join(' ');
    return hexString;
};
