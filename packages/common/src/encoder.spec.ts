import {describe, expect, it} from 'vitest';
import {MsgpackrEncoder, StringEncoder} from './encoder';
import {Uuid, createUuid} from './uuid';

const testData = [
    {input: null, description: 'null value'},
    {input: undefined, description: 'undefined value'},
    {input: true, description: 'boolean true'},
    {input: false, description: 'boolean false'},
    {input: 42, description: 'integer'},
    {input: 3.14, description: 'floating-point number'},
    {input: 'Hello, world!', description: 'string'},
    {input: [1, 2, 3], description: 'array of numbers'},
    {input: {key: 'value'}, description: 'simple object'},
    {input: {nested: {key: 'value'}}, description: 'nested object'},
    {input: [true, null, {key: 42}], description: 'mixed array'},
    {input: Buffer.from('buffer data'), description: 'Buffer object'},
    {input: Buffer.from('buffer data'), description: 'Buffer object'},
];

describe('MsgpackrEncoder', () => {
    const encoder = new MsgpackrEncoder();

    describe('round-trip', () => {
        testData.forEach(({input, description}) => {
            it(`should correctly encode and decode ${description}`, () => {
                const encoded = encoder.encode(input);
                const decoded = encoder.decode(encoded);
                expect(decoded).toEqual(input);
                expect(encoded).toBeInstanceOf(Uint8Array);
            });
        });

        it('uuid', () => {
            const uuid = createUuid();
            const encoded = encoder.encode({uuid});
            const {uuid: result} = encoder.decode(encoded);

            expect(result).instanceOf(Uuid);
            expect(result).toEqual(uuid);
        });
    });

    describe('edge cases', () => {
        it('should throw an error for invalid input to decode', () => {
            const invalidData = new Uint8Array([255, 255, 255]);
            expect(() => encoder.decode(invalidData)).toThrow();
        });

        it('should handle empty buffer during decode', () => {
            const emptyBuffer = new Uint8Array();
            expect(() => encoder.decode(emptyBuffer)).toThrow();
        });
    });
});

describe('StringEncoder', () => {
    const encoder = new StringEncoder();

    describe('encode', () => {
        it('should encode an empty string to an empty Uint8Array', () => {
            const result = encoder.encode('');
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(0);
        });

        it('should encode a simple string correctly', () => {
            const data = 'hello';
            const result = encoder.encode(data);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(new TextDecoder().decode(result)).toBe(data);
        });

        it('should encode a string with special characters correctly', () => {
            const data = '你好, мир! 🌍';
            const result = encoder.encode(data);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(new TextDecoder().decode(result)).toBe(data);
        });

        it('should encode a string with emojis correctly', () => {
            const data = '😀😁😂🤣😃';
            const result = encoder.encode(data);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(new TextDecoder().decode(result)).toBe(data);
        });
    });

    describe('decode', () => {
        it('should decode an empty Uint8Array to an empty string', () => {
            const result = encoder.decode(new Uint8Array());
            expect(result).toBe('');
        });

        it('should decode a Uint8Array back to the original string', () => {
            const data = 'hello';
            const encoded = encoder.encode(data);
            const result = encoder.decode(encoded);
            expect(result).toBe(data);
        });

        it('should decode a Uint8Array with special characters back to the original string', () => {
            const data = '你好, мир! 🌍';
            const encoded = encoder.encode(data);
            const result = encoder.decode(encoded);
            expect(result).toBe(data);
        });

        it('should decode a Uint8Array with emojis back to the original string', () => {
            const data = '😀😁😂🤣😃';
            const encoded = encoder.encode(data);
            const result = encoder.decode(encoded);
            expect(result).toBe(data);
        });
    });

    describe('encode and decode integration', () => {
        it('should encode and decode a simple string to the same value', () => {
            const data = 'Simple test';
            const encoded = encoder.encode(data);
            const decoded = encoder.decode(encoded);
            expect(decoded).toBe(data);
        });

        it('should encode and decode a string with special characters to the same value', () => {
            const data = 'Spécial characters! ñ å';
            const encoded = encoder.encode(data);
            const decoded = encoder.decode(encoded);
            expect(decoded).toBe(data);
        });

        it('should encode and decode a string with emojis to the same value', () => {
            const data = '🎉🚀✨💻📱';
            const encoded = encoder.encode(data);
            const decoded = encoder.decode(encoded);
            expect(decoded).toBe(data);
        });

        it('should handle large strings', () => {
            const data = 'a'.repeat(100000); // Large string
            const encoded = encoder.encode(data);
            const decoded = encoder.decode(encoded);
            expect(decoded).toBe(data);
        });

        it('should handle mixed content', () => {
            const data = 'Hello 🌍! Here are some special characters: 你好, мир, ñ, å, 🚀';
            const encoded = encoder.encode(data);
            const decoded = encoder.decode(encoded);
            expect(decoded).toBe(data);
        });
    });
});
