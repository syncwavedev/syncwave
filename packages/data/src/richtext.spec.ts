import Delta, {AttributeMap} from 'quill-delta';
import {describe, expect, it} from 'vitest';
import {Richtext} from './richtext.js';

describe('Richtext', () => {
    it('should instantiate with an empty delta by default', () => {
        const richtext = new Richtext();
        expect(richtext.length).toBe(0);
        expect(richtext.toString()).toBe('');
        expect(richtext.toDelta().ops).toEqual([]);
    });

    it('should instantiate with a provided delta', () => {
        const initialDelta = new Delta().insert('Hello');
        const richtext = new Richtext(initialDelta);
        expect(richtext.length).toBe(5);
        expect(richtext.toString()).toBe('Hello');
    });

    it('should insert text at the specified index without formatting', () => {
        const richtext = new Richtext();
        richtext.insert(0, 'Hello');
        expect(richtext.toString()).toBe('Hello');
        expect(richtext.length).toBe(5);

        // Insert again in the middle
        richtext.insert(2, 'XX');
        expect(richtext.toString()).toBe('HeXXllo');
        expect(richtext.length).toBe(7);
    });

    it('should insert text with formatting attributes', () => {
        const richtext = new Richtext();
        const attributes: AttributeMap = {bold: true};
        richtext.insert(0, 'BoldText', attributes);

        // Check if attributes are applied to the inserted segment
        const ops = richtext.toDelta().ops;
        expect(richtext.toString()).toBe('BoldText');
        expect(ops[0].attributes).toEqual({bold: true});
    });

    it('should format an existing segment of text', () => {
        const richtext = new Richtext();
        richtext.insert(0, 'Hello World');

        // Format 'World' to be italic
        richtext.format(6, 5, {italic: true});

        const ops = richtext.toDelta().ops;
        expect(richtext.toString()).toBe('Hello World');
        expect(ops).toHaveLength(2);
        /*
      The typical breakdown is:
      1) "Hello "
      2) "World" with { italic: true }
    */
        expect(ops[1].insert).toBe('World');
        expect(ops[1].attributes).toEqual({italic: true});
    });

    it('should delete a specified range of text', () => {
        const richtext = new Richtext();
        richtext.insert(0, 'Hello World');
        richtext.delete(5, 1); // Remove the space between "Hello" and "World"
        expect(richtext.toString()).toBe('HelloWorld');
        expect(richtext.length).toBe(10);

        // Delete part of "World"
        richtext.delete(5, 2);
        expect(richtext.toString()).toBe('Hellorld');
        expect(richtext.length).toBe(8);
    });

    it('should handle out-of-range delete without throwing errors', () => {
        const richtext = new Richtext();
        richtext.insert(0, 'Hello');
        expect(() => {
            // Attempt to delete more characters than actually exist
            richtext.delete(2, 100);
        }).not.toThrow();
        // We only end up with 'He' left
        expect(richtext.toString()).toBe('He');
    });

    it('should update length correctly after multiple operations', () => {
        const richtext = new Richtext();
        // Insert "Hello"
        richtext.insert(0, 'Hello');
        expect(richtext.length).toBe(5);

        // Delete part of it
        richtext.delete(0, 2); // remove 'He'
        expect(richtext.length).toBe(3);

        // Insert something more
        richtext.insert(3, ' World!');
        expect(richtext.length).toBe(10);
    });

    it('should preserve text and attributes when applying multiple deltas', () => {
        const richtext = new Richtext();
        richtext.insert(0, 'Hello ');
        richtext.insert(6, 'World', {bold: true});

        // Format part of "World" further
        richtext.format(6, 3, {italic: true}); // "Wor"

        const ops = richtext.toDelta().ops;
        /*
            We expect something like:
            [
                { insert: 'Hello ' },
                { insert: 'Wor', attributes: { bold: true, italic: true } },
                { insert: 'ld', attributes: { bold: true } }
            ]
        */
        expect(ops).toHaveLength(3);

        expect(ops[1].insert).toBe('Wor');
        expect(ops[1].attributes).toEqual({bold: true, italic: true});

        expect(ops[2].insert).toBe('ld');
        expect(ops[2].attributes).toEqual({bold: true});
    });

    it('should return a correct shallow copy of the delta via toDelta()', () => {
        const richtext = new Richtext();
        richtext.insert(0, 'Test');
        const deltaCopy = richtext.toDelta();

        // The returned delta should be a separate instance
        expect(deltaCopy).toBeInstanceOf(Delta);
        expect(deltaCopy).not.toBe(richtext['delta']);

        // But the contents should match
        expect(deltaCopy.ops).toEqual(richtext['delta'].ops);
    });
});
