import {describe, expect, it} from 'vitest';
import {HexCodec, validateHexString} from './hex.js';

// Test suite for validateHexString
describe('validateHexString', () => {
    it('should return true for a valid single-byte hex string', () => {
        expect(validateHexString('ff')).toBe(true);
    });

    it('should return true for a valid multi-byte hex string', () => {
        expect(validateHexString('0a 1b 2c 3d')).toBe(true);
    });

    it('should return true for an empty string', () => {
        expect(validateHexString('')).toBe(true);
    });

    it('should return false for invalid characters in hex string', () => {
        expect(validateHexString('zz aa')).toBe(false);
    });

    it('should return false for hex string with uneven nibble count', () => {
        expect(validateHexString('1a 2')).toBe(false);
    });

    it('should return false for hex string with invalid spacing', () => {
        expect(validateHexString('1a 2b 3c ')).toBe(false);
    });

    it('should return false for null or undefined input', () => {
        expect(validateHexString(null)).toBe(false);
        expect(validateHexString(undefined)).toBe(false);
    });
});

// Test suite for HexCodec
describe('HexCodec', () => {
    const codec = new HexCodec();

    describe('encode', () => {
        it('should encode a valid hex string into Uint8Array', () => {
            const hexString = 'ff 0a 1b';
            const expected = new Uint8Array([255, 10, 27]);
            expect(codec.encode(hexString)).toEqual(expected);
        });

        it('should encode an empty hex string into an empty Uint8Array', () => {
            expect(codec.encode('')).toEqual(new Uint8Array([]));
        });

        it('should throw an error for invalid hex string', () => {
            expect(() => codec.encode('zz 11')).toThrowError(
                'Invalid hex string format: zz 11'
            );
        });

        it('should throw an error for null or undefined input', () => {
            expect(() =>
                codec.encode(null as unknown as string)
            ).toThrowError();
            expect(() =>
                codec.encode(undefined as unknown as string)
            ).toThrowError();
        });
    });

    describe('decode', () => {
        it('should decode a Uint8Array into a hex string', () => {
            const buf = new Uint8Array([255, 10, 27]);
            const expected = 'ff 0a 1b';
            expect(codec.decode(buf)).toBe(expected);
        });

        it('should decode an empty Uint8Array into an empty string', () => {
            expect(codec.decode(new Uint8Array([]))).toBe('');
        });

        it('should decode a Uint8Array with leading zeros correctly', () => {
            const buf = new Uint8Array([0, 15, 255]);
            const expected = '00 0f ff';
            expect(codec.decode(buf)).toBe(expected);
        });

        it('should handle large Uint8Array inputs correctly', () => {
            const buf = new Uint8Array([0, 127, 255, 128, 64, 32]);
            const expected = '00 7f ff 80 40 20';
            expect(codec.decode(buf)).toBe(expected);
        });
    });
});
