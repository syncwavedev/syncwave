import {describe, expect, it} from 'vitest';
import {Doc} from 'yjs';
import {YjsSerializer} from './yjs-serializer';

// Mock data for tests
const createSampleDoc = () => {
    const doc = new Doc();
    const map = doc.getMap('testMap');
    map.set('key1', 'value1');
    map.set('key2', 'value2');
    return doc;
};

describe('YjsSerializer', () => {
    it('should encode a Yjs Doc into a Uint8Array', () => {
        const doc = createSampleDoc();
        const serializer = new YjsSerializer();
        const encoded = serializer.encode(doc);

        expect(encoded).toBeInstanceOf(Uint8Array);
        expect(encoded.length).toBeGreaterThan(0);
    });

    it('should decode a Uint8Array back into a Yjs Doc', () => {
        const originalDoc = createSampleDoc();
        const serializer = new YjsSerializer();
        const encoded = serializer.encode(originalDoc);

        const decodedDoc = serializer.decode(encoded);

        expect(decodedDoc).toBeInstanceOf(Doc);
        expect(decodedDoc.getMap('testMap').get('key1')).toBe('value1');
        expect(decodedDoc.getMap('testMap').get('key2')).toBe('value2');
    });

    it('should preserve data integrity after encoding and decoding', () => {
        const originalDoc = createSampleDoc();
        const serializer = new YjsSerializer();
        const encoded = serializer.encode(originalDoc);
        const decodedDoc = serializer.decode(encoded);

        const originalMap = originalDoc.getMap('testMap');
        const decodedMap = decodedDoc.getMap('testMap');

        expect(decodedMap.toJSON()).toEqual(originalMap.toJSON());
    });

    it('should handle encoding and decoding an empty Doc', () => {
        const emptyDoc = new Doc();
        const serializer = new YjsSerializer();
        const encoded = serializer.encode(emptyDoc);
        const decodedDoc = serializer.decode(encoded);

        expect(decodedDoc).toBeInstanceOf(Doc);
        expect([...decodedDoc.getMap().entries()].length).toBe(0);
    });

    it('should handle decoding invalid or corrupted data', () => {
        const serializer = new YjsSerializer();
        const invalidData = new Uint8Array([0, 1, 2, 3, 4]);

        expect(() => serializer.decode(invalidData)).toThrowError();
    });

    it('should handle multiple encoding and decoding cycles', () => {
        const originalDoc = createSampleDoc();
        const serializer = new YjsSerializer();

        let currentDoc = originalDoc;
        for (let i = 0; i < 5; i++) {
            const encoded = serializer.encode(currentDoc);
            currentDoc = serializer.decode(encoded);
        }

        expect(currentDoc.getMap('testMap').toJSON()).toEqual(originalDoc.getMap('testMap').toJSON());
    });

    it('should handle large documents', () => {
        const largeDoc = new Doc();
        const map = largeDoc.getMap('largeMap');
        for (let i = 0; i < 1000; i++) {
            map.set(`key${i}`, `value${i}`);
        }

        const serializer = new YjsSerializer();
        const encoded = serializer.encode(largeDoc);
        const decodedDoc = serializer.decode(encoded);

        expect(decodedDoc.getMap('largeMap').toJSON()).toEqual(map.toJSON());
    });
});
