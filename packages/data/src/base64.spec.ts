import {describe, expect, it} from 'vitest';
import {
    Base64Codec,
    decodeBase64,
    encodeBase64,
    type Base64,
} from './base64.js';

describe('Base64Codec', () => {
    const codec = new Base64Codec();

    describe('decode', () => {
        it('should decode a Uint8Array into a base64 string', () => {
            const buf = new Uint8Array([72, 101, 108, 108, 111]);
            const expected = 'SGVsbG8=';
            expect(codec.decode(buf)).toBe(expected);
        });

        it('should decode an empty Uint8Array into an empty string', () => {
            expect(codec.decode(new Uint8Array([]))).toBe('');
        });

        it('should handle large Uint8Array inputs correctly', () => {
            const buf = new Uint8Array([0, 127, 255, 128, 64, 32]);
            const expected = 'AH//gEAg';
            expect(codec.decode(buf)).toBe(expected);
        });
    });

    describe('encode', () => {
        it('should encode a base64 string into Uint8Array', () => {
            const base64String = 'SGVsbG8=' as Base64;
            const expected = new Uint8Array([72, 101, 108, 108, 111]);
            expect(codec.encode(base64String)).toEqual(expected);
        });

        it('should encode an empty base64 string into an empty Uint8Array', () => {
            expect(codec.encode('' as Base64)).toEqual(new Uint8Array([]));
        });
    });
});

describe('Base64 utility functions', () => {
    it('should decode a Uint8Array into a base64 string', () => {
        const buf = new Uint8Array([72, 101, 108, 108, 111]);
        const expected = 'SGVsbG8=';
        expect(decodeBase64(buf)).toBe(expected);
    });

    it('should encode a base64 string into Uint8Array', () => {
        const base64String = 'SGVsbG8=' as Base64;
        const expected = new Uint8Array([72, 101, 108, 108, 111]);
        expect(encodeBase64(base64String)).toEqual(expected);
    });
});
