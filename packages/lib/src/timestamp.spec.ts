import {describe, expect, test} from 'vitest';
import {addHours, addYears, getNow, type Timestamp} from './timestamp.js';

// Helper function to check if a value is a valid timestamp
const isValidTimestamp = (value: any): value is Timestamp => {
    return typeof value === 'number' && !Number.isNaN(value);
};

describe('getNow', () => {
    test('returns a valid timestamp', () => {
        const now = getNow();
        expect(isValidTimestamp(now)).toBe(true);
    });
});

describe('addHours', () => {
    test('correctly adds hours to a timestamp', () => {
        const now = getNow();
        const result = addHours(now, 5);
        expect(result).toBeTypeOf('number');
        expect(isValidTimestamp(result)).toBe(true);
        expect(result).toBeGreaterThan(now);
    });

    test('handles negative hours correctly', () => {
        const now = getNow();
        const result = addHours(now, -3);
        expect(result).toBeLessThan(now);
    });
});

describe('addYears', () => {
    test('correctly adds years to a timestamp', () => {
        const now = getNow();
        const result = addYears(now, 2);
        expect(result).toBeTypeOf('number');
        expect(isValidTimestamp(result)).toBe(true);
        expect(result).toBeGreaterThan(now);
    });

    test('handles negative years correctly', () => {
        const now = getNow();
        const result = addYears(now, -1);
        expect(result).toBeLessThan(now);
    });
});
