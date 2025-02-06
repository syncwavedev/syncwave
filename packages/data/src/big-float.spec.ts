import {describe, expect, it} from 'vitest';
import {
    bigFloatAdd,
    bigFloatDiv,
    bigFloatMul,
    bigFloatSub,
    bigintGcd,
    toBigFloat,
} from './big-float.js';

describe('bigFloat operations', () => {
    it('should convert numbers to bigFloats', () => {
        expect(toBigFloat(5)).toEqual({
            numerator: '5',
            denominator: '1',
        });
    });

    it('should add bigFloats', () => {
        expect(bigFloatAdd(1, 2)).toEqual({
            numerator: '3',
            denominator: '1',
        });

        expect(bigFloatAdd(0.1, 0.2)).toEqual({
            numerator: '3',
            denominator: '10',
        });
    });

    it('should subtract bigFloats', () => {
        expect(bigFloatSub(5, 3)).toEqual({
            numerator: '2',
            denominator: '1',
        });

        expect(bigFloatSub(0.3, 0.1)).toEqual({
            numerator: '1',
            denominator: '5',
        });
    });

    it('should multiply bigFloats', () => {
        expect(bigFloatMul(2, 3)).toEqual({
            numerator: '6',
            denominator: '1',
        });

        expect(bigFloatMul(0.1, 0.2)).toEqual({
            numerator: '1',
            denominator: '50',
        });
    });

    it('should divide bigFloats', () => {
        expect(bigFloatDiv(6, 2)).toEqual({
            numerator: '3',
            denominator: '1',
        });

        expect(bigFloatDiv(0.3, 0.1)).toEqual({
            numerator: '3',
            denominator: '1',
        });
    });

    it('should calculate GCD correctly', () => {
        expect(Number(bigintGcd(BigInt(12), BigInt(8)))).toBe(4);
        expect(Number(bigintGcd(BigInt(17), BigInt(5)))).toBe(1);
        expect(Number(bigintGcd(BigInt(0), BigInt(5)))).toBe(5);
    });

    it('should handle bigFloat objects directly', () => {
        const bigFloat = {
            numerator: '2',
            denominator: '1',
        };
        expect(toBigFloat(bigFloat)).toEqual(bigFloat);
    });

    it('should simplify fractions', () => {
        expect(bigFloatMul(2, 0.5)).toEqual({
            numerator: '1',
            denominator: '1',
        });
    });
});
