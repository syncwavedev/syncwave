import {describe, expect, it} from 'vitest';
import {MsgpackCodec} from './codec.js';
import {createUuid} from './uuid.js';

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

describe('MsgpackrCode', () => {
    const codec = new MsgpackCodec<any>();

    describe('round-trip', () => {
        testData.forEach(({input, description}) => {
            it(`should correctly encode and decode ${description}`, () => {
                const encoded = codec.encode(input);
                const decoded = codec.decode(encoded);
                expect(decoded).toEqual(input);
                expect(encoded).toBeInstanceOf(Uint8Array);
            });
        });

        it('uuid', () => {
            const uuid = createUuid();
            const encoded = codec.encode({uuid});
            const {uuid: result} = codec.decode(encoded);

            expect(result).toEqual(uuid);
        });
    });

    describe('edge cases', () => {
        it('should throw an error for invalid input to decode', () => {
            const invalidData = new Uint8Array([255, 255, 255]);
            expect(() => codec.decode(invalidData)).toThrow();
        });

        it('should handle empty buffer during decode', () => {
            const emptyBuffer = new Uint8Array();
            expect(() => codec.decode(emptyBuffer)).toThrow();
        });
    });
});
