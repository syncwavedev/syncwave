import {describe, expect, it} from 'vitest';
import {MsgpackrSerializer} from './msgpackr-serializer';

describe('MsgpackrSerializer', () => {
    const serializer = new MsgpackrSerializer();

    describe('encode', () => {
        it('should encode an object to Uint8Array', () => {
            const data = {name: 'Alice', age: 30};
            const encoded = serializer.encode(data);
            expect(encoded).toBeInstanceOf(Uint8Array);
            expect(encoded.length).toBeGreaterThan(0);
        });

        it('should encode an array to Uint8Array', () => {
            const data = [1, 'two', {three: 3}];
            const encoded = serializer.encode(data);
            expect(encoded).toBeInstanceOf(Uint8Array);
            expect(encoded.length).toBeGreaterThan(0);
        });

        it('should encode primitive types correctly', () => {
            const primitives = [42, 'hello', true, null, undefined];
            primitives.forEach(primitive => {
                const encoded = serializer.encode(primitive);
                expect(encoded).toBeInstanceOf(Uint8Array);
                expect(encoded.length).toBeGreaterThan(0);
            });
        });
    });

    describe('decode', () => {
        it('should decode Uint8Array back to original object', () => {
            const data = {name: 'Bob', active: true};
            const encoded = serializer.encode(data);
            const decoded = serializer.decode(encoded);
            expect(decoded).toEqual(data);
        });

        it('should decode Uint8Array back to original array', () => {
            const data = [1, 'two', {three: 3}];
            const encoded = serializer.encode(data);
            const decoded = serializer.decode(encoded);
            expect(decoded).toEqual(data);
        });

        it('should decode primitive types correctly', () => {
            const primitives = [42, 'hello', true, null, undefined];
            primitives.forEach(primitive => {
                const encoded = serializer.encode(primitive);
                const decoded = serializer.decode(encoded);
                expect(decoded).toEqual(primitive);
            });
        });

        it('should throw an error for invalid Uint8Array', () => {
            const invalid = new Uint8Array([0xff, 0xff, 0xff]);
            expect(() => serializer.decode(invalid)).toThrow();
        });
    });

    describe('encode and decode integration', () => {
        it('should return the original data after encode and decode', () => {
            const testData = [
                {a: 1, b: 'test', c: true},
                [1, 2, 3, 'four'],
                'A simple string',
                12345,
                null,
                undefined,
                true,
                false,
                {nested: {a: {b: {c: 'deep'}}}},
            ];

            testData.forEach(data => {
                const encoded = serializer.encode(data);
                const decoded = serializer.decode(encoded);
                expect(decoded).toEqual(data);
            });
        });
    });
});
