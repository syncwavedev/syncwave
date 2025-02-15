import {describe, expect, it} from 'vitest';
import {
    BigFloat,
    bigFloatAdd,
    bigFloatDiv,
    bigFloatMul,
    bigFloatSub,
    bigintGcd,
    stringifyDecimal,
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

    it('should handle negative numbers', () => {
        expect(bigFloatAdd(-1, 2)).toEqual({
            numerator: '1',
            denominator: '1',
        });

        expect(bigFloatSub(-1, 2)).toEqual({
            numerator: '-3',
            denominator: '1',
        });

        expect(bigFloatMul(-1, 2)).toEqual({
            numerator: '-2',
            denominator: '1',
        });

        expect(bigFloatDiv(-1, 2)).toEqual({
            numerator: '-1',
            denominator: '2',
        });
    });

    it('should handle huge numbers', () => {
        expect(
            bigFloatDiv(
                BigInt('2' + '0'.repeat(1000)),
                BigInt('1' + '0'.repeat(1000))
            )
        ).toEqual({
            numerator: '2',
            denominator: '1',
        });
    });
});

describe('stringifyDecimal', () => {
    it('should correctly convert a simple integer value', () => {
        const input: BigFloat = {numerator: '10', denominator: '2'};
        const result = stringifyDecimal(input, 10);
        expect(result).toBe('5');
    });

    it('should correctly convert a value with a non-zero decimal', () => {
        const input: BigFloat = {numerator: '7', denominator: '3'};
        const result = stringifyDecimal(input, 100);
        const [integerPart, fractionalPart] = result.split('.');
        expect(integerPart).toBe('2');
        expect(fractionalPart.split('').every(digit => digit === '3')).toBe(
            true
        );
        expect(fractionalPart.length).toEqual(100);
    });

    it('should correctly handle very large numbers', () => {
        const input: BigFloat = {
            numerator: '123423234234234234234234234',
            denominator: '3',
        };
        const result = stringifyDecimal(input, 10);
        expect(result).toBe('41141078078078078078078078');
    });

    it('should handle zero as numerator', () => {
        const input: BigFloat = {numerator: '0', denominator: '5'};
        const result = stringifyDecimal(input, 10);
        expect(result).toBe('0');
    });

    it('should handle very small decimal results', () => {
        const input: BigFloat = {
            numerator: '1',
            denominator: '1000000000000000000000',
        };
        const result = stringifyDecimal(input, 100);
        expect(result).toBe('0.000000000000000000001');
    });

    it('should handle numerator smaller than denominator', () => {
        const input: BigFloat = {numerator: '1', denominator: '2'};
        const result = stringifyDecimal(input, 10);
        expect(result).toBe('0.5');
    });

    it('should return a string with a decimal point even when there are no remaining digits', () => {
        const input: BigFloat = {numerator: '5', denominator: '2'};
        const result = stringifyDecimal(input, 10);
        expect(result).toBe('2.5');
    });
});
