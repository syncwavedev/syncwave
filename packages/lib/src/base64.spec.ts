import {describe, expect, it} from 'vitest';
import {decodeBase64, encodeBase64, type Base64} from './base64.js';

describe('base64 encode / decode', () => {
    describe('decode', () => {
        it('should decode a Uint8Array into a base64 string', () => {
            const buf = new Uint8Array([72, 101, 108, 108, 111]);
            const expected = 'SGVsbG8=';
            expect(decodeBase64(buf)).toBe(expected);
        });

        it('should decode an empty Uint8Array into an empty string', () => {
            expect(decodeBase64(new Uint8Array([]))).toBe('');
        });

        it('should handle large Uint8Array inputs correctly', () => {
            const buf = new Uint8Array([0, 127, 255, 128, 64, 32]);
            const expected = 'AH//gEAg';
            expect(decodeBase64(buf)).toBe(expected);
        });
    });

    describe('encode', () => {
        it('should encode a base64 string into Uint8Array', () => {
            const base64String = 'SGVsbG8=' as Base64;
            const expected = new Uint8Array([72, 101, 108, 108, 111]);
            expect(encodeBase64(base64String)).toEqual(expected);
        });

        it('should encode an empty base64 string into an empty Uint8Array', () => {
            expect(encodeBase64('' as Base64)).toEqual(new Uint8Array([]));
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
