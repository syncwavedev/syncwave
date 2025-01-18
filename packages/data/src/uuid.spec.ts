import {parse} from 'uuid';
import {describe, expect, it} from 'vitest';
import {Uuid, UuidCodec, createUuid} from './uuid.js';

describe('Uuid class', () => {
    it('should store the correct UUID string', () => {
        const testUuid = '123e4567-e89b-12d3-a456-426614174000';
        const uuidInstance = new Uuid(testUuid);
        expect(uuidInstance.toString()).toBe(testUuid);
    });

    it('should have a __type property set to uuid', () => {
        const uuidInstance = new Uuid('123e4567-e89b-12d3-a456-426614174000');
        expect(uuidInstance.__type).toBe('uuid');
    });
});

describe('createUuid function', () => {
    it('should create a valid Uuid instance', () => {
        const uuidInstance = createUuid();
        expect(uuidInstance).toBeInstanceOf(Uuid);
    });

    it('should create a valid UUID string', () => {
        const uuidInstance = createUuid();
        const uuidString = uuidInstance.toString();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(uuidString)).toBe(true);
    });
});

describe('UuidCodec class', () => {
    const codec = new UuidCodec();

    it('should encode a Uuid instance into a Uint8Array', () => {
        const testUuid = '123e4567-e89b-12d3-a456-426614174000';
        const uuidInstance = new Uuid(testUuid);
        const encoded = codec.encode(uuidInstance);
        expect(encoded).toBeInstanceOf(Uint8Array);
        expect(encoded).toEqual(parse(testUuid));
    });

    it('should decode a Uint8Array back into a Uuid instance', () => {
        const testUuid = '123e4567-e89b-12d3-a456-426614174000';
        const encoded = parse(testUuid);
        const decoded = codec.decode(encoded);
        expect(decoded).toBeInstanceOf(Uuid);
        expect(decoded.toString()).toBe(testUuid);
    });

    it('should preserve the UUID value during encode and decode', () => {
        const uuidInstance = createUuid();
        const encoded = codec.encode(uuidInstance);
        const decoded = codec.decode(encoded);
        expect(decoded.toString()).toBe(uuidInstance.toString());
    });

    it('should throw an error when decoding an invalid Uint8Array', () => {
        const invalidUint8Array = new Uint8Array([255, 255, 255, 255]);
        expect(() => codec.decode(invalidUint8Array)).toThrow();
    });
});
