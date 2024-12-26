import Delta from 'quill-delta';
import {describe, expect, it} from 'vitest';
import {assert} from '../utils';
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

    describe('update', () => {
        it('should update the object', () => {
            const doc = Doc.create(object({val: [1, number()]}), {val: 111});
            doc.update(x => {
                x.val = 112;
            });

            expect(doc.snapshot()).toEqual({val: 112});
        });

        it('should replace the object', () => {
            const doc = Doc.create(object({val: [1, number()]}), {val: 111});
            doc.update(() => {
                return {val: 312};
            });

            expect(doc.snapshot()).toEqual({val: 312});
        });

        it('should update string', () => {
            const doc = Doc.create(object({s: [1, string()]}), {s: 'one'});
            doc.update(x => {
                x.s = 'two';
            });
            expect(doc.snapshot()).toEqual({s: 'two'});
        });

        it('should update array (push)', () => {
            const doc = Doc.create(object({arr: [1, array(number())]}), {arr: [3, 4, 5]});
            doc.update(x => {
                x.arr.push(6);
            });
            expect(doc.snapshot()).toEqual({arr: [3, 4, 5, 6]});
        });

        it('should update array (unshift)', () => {
            const doc = Doc.create(object({arr: [1, array(number())]}), {arr: [3, 4, 5]});
            doc.update(x => {
                x.arr.unshift(6, 7);
            });
            expect(doc.snapshot()).toEqual({arr: [6, 7, 3, 4, 5]});
        });

        it('should update array (set)', () => {
            const doc = Doc.create(object({arr: [1, array(number())]}), {arr: [1, 1, 1, 1]});
            doc.update(x => {
                x.arr[3] = 3;
            });
            expect(doc.snapshot()).toEqual({arr: [1, 1, 1, 3]});
        });

        it('should support root string', () => {
            const doc = Doc.create(string(), 'init');
            doc.update(() => 'updated');

            expect(doc.snapshot()).toEqual('updated');
        });

        it('should support richtext (delete)', () => {
            const doc = Doc.create(richtext(), new Richtext());
            doc.update(x => {
                x.insert(0, 'some content');
            });
            doc.update(x => {
                x.delete(2, 2);
            });

            expect(doc.snapshot().toString()).toEqual('so content');
        });

        it('should support richtext (format)', () => {
            const doc = Doc.create(richtext(), new Richtext(new Delta().insert('some')));
            doc.update(x => {
                x.format(1, 2, {bold: true});
            });

            expect(doc.snapshot().toDelta()).toEqual(
                new Delta().insert('some').compose(new Delta().retain(1).retain(2, {bold: true}))
            );
        });

        it('should support richtext (insert)', () => {
            const doc = Doc.create(richtext(), new Richtext(new Delta().insert('some')));
            doc.update(x => {
                x.insert(4, ' content');
            });

            expect(doc.snapshot().toString()).toEqual('some content');
        });

        it('should support richtext (applyDelta)', () => {
            const doc = Doc.create(richtext(), new Richtext(new Delta().insert('some content')));
            doc.update(x => {
                x.applyDelta(new Delta().retain('some content'.length).insert('!!!'));
            });

            expect(doc.snapshot().toString()).toEqual('some content!!!');
        });

        it('should support boolean update', () => {
            const doc = Doc.create(object({b: [1, boolean()]}), {b: false});
            doc.update(x => {
                x.b = true;
            });

            expect(doc.snapshot()).toEqual({b: true});
        });

        it('should clear map', () => {
            const doc = Doc.create(
                map(string()),
                new Map([
                    ['a', 'one'],
                    ['b', 'two'],
                ])
            );
            doc.update(x => {
                x.clear();
                assert(x.size === 0);
            });

            expect([...doc.snapshot().entries()]).toEqual([]);
        });

        it('should set map item', () => {
            const doc = Doc.create(
                map(string()),
                new Map([
                    ['a', 'v1'],
                    ['b', 'v1'],
                ])
            );
            doc.update(x => {
                x.set('a', 'v2');
                x.set('c', 'v1');
            });

            expect([...doc.snapshot().entries()]).toEqual([
                ['a', 'v2'],
                ['b', 'v1'],
                ['c', 'v1'],
            ]);
        });

        it('should delete map item', () => {
            const doc = Doc.create(
                map(string()),
                new Map([
                    ['a', 'v1'],
                    ['b', 'v1'],
                ])
            );
            doc.update(x => {
                x.delete('a');
                assert(!x.has('a'));
                assert(x.has('b'));
            });

            expect([...doc.snapshot().entries()]).toEqual([['b', 'v1']]);
        });

        it('should support updating optional schema', () => {
            const doc = Doc.create(object({val: [1, optional(number())]}), {val: 2});
            doc.update(x => {
                x.val = undefined;
                assert(x.val === undefined);
            });
            expect(doc.snapshot()).toEqual({val: undefined});
            doc.update(x => {
                x.val = 3;
                assert(x.val === 3);
            });
            expect(doc.snapshot()).toEqual({val: 3});
        });

        it('should support updating optional schema', () => {
            const doc = Doc.create(object({val: [1, nullable(number())]}), {val: 2});
            doc.update(x => {
                x.val = null;
                assert(x.val === null);
            });
            expect(doc.snapshot()).toEqual({val: null});
            doc.update(x => {
                x.val = 3;
                assert(x.val === 3);
            });
            expect(doc.snapshot()).toEqual({val: 3});
        });
    });
});
