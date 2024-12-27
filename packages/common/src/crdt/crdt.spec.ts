import Delta from 'quill-delta';
import {describe, expect, it} from 'vitest';
import {Richtext} from '../richtext';
import {assert} from '../utils';
import {Crdt} from './crdt';

describe('Doc', () => {
    it('should create new string Doc', () => {
        const doc = Crdt.from({
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

    function createReplica<T>(doc: Crdt<T>): Crdt<T> {
        const replica = Crdt.load(doc.state());
        doc.subscribe('update', diff => replica.apply(diff));
        return replica;
    }

    describe('update', () => {
        it('should update the object', () => {
            const doc = Crdt.from({val: 111});
            const replica = createReplica(doc);
            doc.update(x => {
                x.val = 112;
            });

            expect(doc.snapshot()).toEqual({val: 112});
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should replace the object', () => {
            const doc = Crdt.from({val: 111});

            const replica = createReplica(doc);
            doc.update(() => {
                return {val: 312};
            });

            expect(doc.snapshot()).toEqual({val: 312});
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should update string', () => {
            const doc = Crdt.from({s: 'one'});

            const replica = createReplica(doc);
            doc.update(x => {
                x.s = 'two';
            });
            expect(doc.snapshot()).toEqual({s: 'two'});
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should update array (push)', () => {
            const doc = Crdt.from({arr: [3, 4, 5]});

            const replica = createReplica(doc);
            doc.update(x => {
                x.arr.push(6);
            });
            expect(doc.snapshot()).toEqual({arr: [3, 4, 5, 6]});
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should update array (unshift)', () => {
            const doc = Crdt.from({arr: [3, 4, 5]});

            const replica = createReplica(doc);
            doc.update(x => {
                x.arr.unshift(6, 7);
            });
            expect(doc.snapshot()).toEqual({arr: [6, 7, 3, 4, 5]});
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should update array (set)', () => {
            const doc = Crdt.from({arr: [1, 1, 1, 1]});

            const replica = createReplica(doc);
            doc.update(x => {
                x.arr[3] = 3;
            });
            expect(doc.snapshot()).toEqual({arr: [1, 1, 1, 3]});
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support root string', () => {
            const doc = Crdt.from('init');

            const replica = createReplica(doc);
            doc.update(() => 'updated');

            expect(doc.snapshot()).toEqual('updated');
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support richtext (delete)', () => {
            const doc = Crdt.from(new Richtext());

            const replica = createReplica(doc);
            doc.update(x => {
                x.insert(0, 'some content');
            });
            doc.update(x => {
                x.delete(2, 2);
            });

            expect(doc.snapshot().toString()).toEqual('so content');
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support richtext (format)', () => {
            const doc = Crdt.from(new Richtext(new Delta().insert('some')));

            const replica = createReplica(doc);
            doc.update(x => {
                x.format(1, 2, {bold: true});
            });

            expect(doc.snapshot().toDelta()).toEqual(
                new Delta().insert('some').compose(new Delta().retain(1).retain(2, {bold: true}))
            );
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support richtext (insert)', () => {
            const doc = Crdt.from(new Richtext(new Delta().insert('some')));

            const replica = createReplica(doc);
            doc.update(x => {
                x.insert(4, ' content');
            });

            expect(doc.snapshot().toString()).toEqual('some content');
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support richtext (applyDelta)', () => {
            const doc = Crdt.from(new Richtext(new Delta().insert('some content')));

            const replica = createReplica(doc);
            doc.update(x => {
                x.applyDelta(new Delta().retain('some content'.length).insert('!!!'));
            });

            expect(doc.snapshot().toString()).toEqual('some content!!!');
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support boolean update', () => {
            const doc = Crdt.from({b: false});

            const replica = createReplica(doc);
            doc.update(x => {
                x.b = true;
            });

            expect(doc.snapshot()).toEqual({b: true});
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should clear map', () => {
            const doc = Crdt.from(
                new Map([
                    ['a', 'one'],
                    ['b', 'two'],
                ])
            );

            const replica = createReplica(doc);
            doc.update(x => {
                x.clear();
                assert(x.size === 0);
            });

            expect([...doc.snapshot().entries()]).toEqual([]);
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should set map item', () => {
            const doc = Crdt.from(
                new Map([
                    ['a', 'v1'],
                    ['b', 'v1'],
                ])
            );
            const replica = createReplica(doc);

            doc.update(x => {
                x.set('a', 'v2');
                x.set('c', 'v1');
            });

            expect([...doc.snapshot().entries()]).toEqual([
                ['a', 'v2'],
                ['b', 'v1'],
                ['c', 'v1'],
            ]);
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should delete map item', () => {
            const doc = Crdt.from(
                new Map([
                    ['a', 'v1'],
                    ['b', 'v1'],
                ])
            );
            const replica = createReplica(doc);

            doc.update(x => {
                x.delete('a');
                assert(!x.has('a'));
                assert(x.has('b'));
            });

            expect([...doc.snapshot().entries()]).toEqual([['b', 'v1']]);
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support updating optional schema', () => {
            const doc = Crdt.from<{val: number | undefined}>({val: 2});

            const replica = createReplica(doc);
            doc.update(x => {
                x.val = undefined;
                assert(x.val === undefined);
            });
            expect(doc.snapshot()).toEqual({val: undefined});
            expect(doc.snapshot()).toEqual(replica.snapshot());
            expect(doc.snapshot()).toEqual(replica.snapshot());

            doc.update(x => {
                x.val = 3;
                assert(x.val === 3);
            });
            expect(doc.snapshot()).toEqual({val: 3});
            expect(doc.snapshot()).toEqual(replica.snapshot());
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support updating optional schema', () => {
            const doc = Crdt.from<{val: number | null}>({val: 2});

            const replica = createReplica(doc);
            doc.update(x => {
                x.val = null;
                assert(x.val === null);
            });
            expect(doc.snapshot()).toEqual({val: null});
            expect(doc.snapshot()).toEqual(replica.snapshot());
            expect(doc.snapshot()).toEqual(replica.snapshot());

            doc.update(x => {
                x.val = 3;
                assert(x.val === 3);
            });
            expect(doc.snapshot()).toEqual({val: 3});
            expect(doc.snapshot()).toEqual(replica.snapshot());
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should unsubscribe from updates', () => {
            const a = Crdt.from({val: 1});
            const b = Crdt.load(a.state());
            const unsub = a.subscribe('update', diff => b.apply(diff));

            expect(b.snapshot()).toEqual({val: 1});

            a.update(x => {
                x.val = 2;
            });
            expect(b.snapshot()).toEqual({val: 2});

            unsub();

            a.update(x => {
                x.val = 3;
            });
            expect(b.snapshot()).toEqual({val: 2});
        });
    });
});
