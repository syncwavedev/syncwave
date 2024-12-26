import Delta from 'quill-delta';
import {describe, expect, it} from 'vitest';
import {Doc} from './doc';
import {Richtext} from './richtext';
import {array, boolean, map, nullable, number, object, optional, richtext, string} from './schema';

describe('Doc', () => {
    it('should create new string Doc', () => {
        const simpleObjSchema = object({
            a: [1, number()],
            b: [2, number()],
        });

        const doc = Doc.create(
            object({
                string: [1, string()],
                richtext: [2, richtext()],
                number: [3, number()],
                boolean: [4, boolean()],
                map: [5, map(simpleObjSchema)],
                array: [6, array(simpleObjSchema)],
                object: [7, simpleObjSchema],
                optional: [8, optional(simpleObjSchema)],
                nullable: [9, nullable(simpleObjSchema)],
            }),
            {
                string: 'one',
                richtext: new Richtext(new Delta().insert('two')),
                number: 3,
                boolean: true,
                map: new Map([['key', {a: 4, b: 5}]]),
                array: [
                    {a: 6, b: 7},
                    {a: 8, b: 9},
                ],
                object: {
                    a: 14,
                    b: 15,
                },
                optional: undefined,
                nullable: null,
            }
        );

        expect(doc.snapshot()).toEqual({
            string: 'one',
            richtext: new Richtext(new Delta().insert('two')),
            number: 3,
            boolean: true,
            map: new Map([['key', {a: 4, b: 5}]]),
            array: [
                {a: 6, b: 7},
                {a: 8, b: 9},
            ],
            object: {
                a: 14,
                b: 15,
            },
            optional: undefined,
            nullable: null,
        });
    });
});
