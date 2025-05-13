import {describe, expect, it} from 'vitest';
import {validateHexString} from './hex.js';

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
