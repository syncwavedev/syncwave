/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {describe, expect, it, vi} from 'vitest';
import {XmlFragment} from 'yjs';
import type {Timestamp} from '../timestamp.js';
import {assert} from '../utils.js';
import {Crdt, type ValueChange} from './crdt.js';
import {createRichtext} from './richtext.js';

const createTestDocDiff = <T>(data: T) => Crdt.from(data).state();

describe('Doc', () => {
    it('should create new Doc', () => {
        const doc = Crdt.from({
            string: 'one',
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
            richtext: createRichtext(),
            nullable: null,
        });

        expect(doc.snapshot()).toEqual({
            string: 'one',
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
            richtext: createRichtext(),
            optional: undefined,
            nullable: null,
        });
    });

    function createReplica<T>(doc: Crdt<T>): Crdt<T> {
        const replica = Crdt.load(doc.state());
        doc.onUpdate(diff => replica.apply(diff));
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
                assert(x.size === 0, 'should be empty');
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
                assert(!x.has('a'), 'should be deleted');
                assert(x.has('b'), 'should be present');
            });

            expect([...doc.snapshot().entries()]).toEqual([['b', 'v1']]);
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should support updating optional schema', () => {
            const doc = Crdt.from<{val: number | undefined}>({val: 2});

            const replica = createReplica(doc);
            doc.update(x => {
                x.val = undefined;
                assert(x.val === undefined, 'should be undefined');
            });
            expect(doc.snapshot()).toEqual({val: undefined});
            expect(doc.snapshot()).toEqual(replica.snapshot());
            expect(doc.snapshot()).toEqual(replica.snapshot());

            doc.update(x => {
                x.val = 3;
                assert(x.val === 3, 'should be 3');
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
                assert(x.val === null, 'should be null');
            });
            expect(doc.snapshot()).toEqual({val: null});
            expect(doc.snapshot()).toEqual(replica.snapshot());
            expect(doc.snapshot()).toEqual(replica.snapshot());

            doc.update(x => {
                x.val = 3;
                assert(x.val === 3, 'should be 3');
            });
            expect(doc.snapshot()).toEqual({val: 3});
            expect(doc.snapshot()).toEqual(replica.snapshot());
            expect(doc.snapshot()).toEqual(replica.snapshot());
        });

        it('should unsubscribe from updates', async () => {
            const a = Crdt.from({val: 1});
            const b = Crdt.load(a.state());
            const unsub = a.onUpdate(diff => b.apply(diff));

            expect(b.snapshot()).toEqual({val: 1});

            a.update(x => {
                x.val = 2;
            });
            expect(b.snapshot()).toEqual({val: 2});

            unsub('test');

            a.update(x => {
                x.val = 3;
            });
            expect(b.snapshot()).toEqual({val: 2});
        });
    });

    it('should create a Crdt instance from a plain value', () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        expect(crdt.snapshot()).toEqual(value);
    });

    it('should load a Crdt instance from a DocDiff', () => {
        const diff = createTestDocDiff({key: 'value'});
        const crdt = Crdt.load(diff);
        expect(crdt).toBeInstanceOf(Crdt);
    });

    it('should return the correct snapshot', () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        expect(crdt.snapshot()).toEqual(value);
    });

    it('should return the correct state as DocDiff', () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        const state = crdt.state();
        expect(state).toBeDefined();
    });

    it('should map over the Crdt instance', () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        const result = crdt.map(snapshot => snapshot.key);
        expect(result).toBe('value');
    });

    it('should update the Crdt instance with a recipe function', () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        crdt.update(draft => {
            draft.key = 'updatedValue';
        });
        expect(crdt.snapshot()).toEqual({key: 'updatedValue'});
    });

    it('should support subscribing to updates', async () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        const callback = vi.fn();

        const unsub = crdt.onUpdate(callback);

        const diff = createTestDocDiff({key: 'newValue'});
        crdt.apply(diff);

        expect(callback).toHaveBeenCalledWith(
            {
                timestamp: expect.any(Number) as Timestamp,
                payload: expect.any(Uint8Array) as Uint8Array,
            },
            {
                tag: undefined,
            }
        );

        unsub('test');
    });

    it('should unsubscribe from updates', async () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        const callback = vi.fn();

        const unsub = crdt.onUpdate(callback);
        unsub('test');

        const diff = createTestDocDiff({key: 'newValue'});
        crdt.apply(diff);

        expect(callback).not.toHaveBeenCalled();
    });

    it('should handle deeply nested structures in snapshot', () => {
        const value = {nested: {key: 'value'}};
        const crdt = Crdt.from(value);
        expect(crdt.snapshot()).toEqual(value);
    });

    it('should handle deeply nested structures in update', () => {
        const value = {nested: {key: 'value'}};
        const crdt = Crdt.from(value);
        crdt.update(draft => {
            draft.nested.key = 'updatedValue';
        });
        expect(crdt.snapshot()).toEqual({nested: {key: 'updatedValue'}});
    });

    it('should throw error if unsupported value type is passed to mapToYValue', () => {
        const unsupportedValue = new Date();
        expect(() => Crdt.from(unsupportedValue)).toThrow();
    });

    it('should throw error if unsupported YValue type is passed to mapFromYValue', () => {
        const unsupportedYValue = Symbol('unsupported');
        expect(() => Crdt.from(unsupportedYValue)).toThrow();
    });

    it('should preserve object references in snapshots', () => {
        const value = {arr: [{key: 'value'}]};
        const crdt = Crdt.from(value);
        expect(crdt.snapshot().arr[0]).toEqual(value.arr[0]);
    });

    it('should correctly map arrays in updates', () => {
        const value = {arr: [1, 2, 3]};
        const crdt = Crdt.from(value);
        crdt.update(draft => {
            draft.arr.push(4);
        });
        expect(crdt.snapshot()).toEqual({arr: [1, 2, 3, 4]});
    });

    it('should support string updates with YText', () => {
        const value = {text: 'initial'};
        const crdt = Crdt.from(value);
        crdt.update(draft => {
            draft.text = 'updated';
        });
        expect(crdt.snapshot()).toEqual({text: 'updated'});
    });

    it('should handle empty object snapshots', () => {
        const crdt = Crdt.from({});
        expect(crdt.snapshot()).toEqual({});
    });

    it('should support empty arrays in snapshots', () => {
        const crdt = Crdt.from([]);
        expect(crdt.snapshot()).toEqual([]);
    });

    it('should maintain separate snapshots for different Crdt instances', () => {
        const value1 = {key: 'value1'};
        const value2 = {key: 'value2'};

        const crdt1 = Crdt.from(value1);
        const crdt2 = Crdt.from(value2);

        expect(crdt1.snapshot()).toEqual(value1);
        expect(crdt2.snapshot()).toEqual(value2);
    });

    it('should handle concurrent subs and updates', async () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        const unsub1 = crdt.onUpdate(callback1);
        const unsub2 = crdt.onUpdate(callback2);

        const diff = createTestDocDiff({key: 'newValue'});
        crdt.apply(diff);

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();

        unsub1('test');
        unsub2('test');
    });

    it('should handle updates with complex structures', () => {
        const value = {nested: [{key: 'value'}]};
        const crdt = Crdt.from(value);

        crdt.update(draft => {
            draft.nested[0].key = 'newValue';
        });

        expect(crdt.snapshot()).toEqual({nested: [{key: 'newValue'}]});
    });

    it('should propagate events in correct order', () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        const events: string[] = [];

        crdt.onUpdate((diff, options) => {
            events.push((options.origin as string) || 'no-tag');
        });

        crdt.apply(createTestDocDiff({key: 'value1'}), {origin: 'first'});
        crdt.apply(createTestDocDiff({key: 'value2'}), {origin: 'second'});

        expect(events).toEqual(['first', 'second']);
    });

    it('should correctly unsubscribe in concurrent scenarios', async () => {
        const value = {key: 'value'};
        const crdt = Crdt.from(value);
        const callback = vi.fn();

        const unsub = crdt.onUpdate(callback);
        unsub('test');

        const diff = createTestDocDiff({key: 'newValue'});
        crdt.apply(diff);

        expect(callback).not.toHaveBeenCalled();
    });

    it('should handle large nested structures efficiently', () => {
        const largeValue = {
            key: Array.from({length: 1000}, (_, i) => ({
                id: i,
                value: `value${i}`,
            })),
        };
        const crdt = Crdt.from(largeValue);

        crdt.update(draft => {
            draft.key[500].value = 'updatedValue';
        });

        expect(crdt.snapshot().key[500].value).toEqual('updatedValue');
    });

    it('should extract richtext', () => {
        const doc = Crdt.from({
            richtext: createRichtext(),
        });

        const fragment = doc.extractXmlFragment(x => x.richtext);
        expect(fragment).toBeInstanceOf(XmlFragment);
    });

    it('should track changes', () => {
        const doc = Crdt.from<any>({
            a: 1,
            b: [2, {x: new Map([['value', 3]])}] as const,
            z: 'delete me',
        });

        const changes: ValueChange[] = [];
        doc.onChange(x => {
            changes.push(...x);
        });

        doc.update(x => {
            x.a = 2;
            x.c = 'new';
            delete x.z;
            x.b[1].x.set('value', 4);
        });

        expect(changes).toEqual([
            {path: ['a'], value: 2},
            {path: ['c'], value: 'new'},
            {path: ['z'], value: undefined},
            {path: ['b', 1, 'x', 'value'], value: 4},
        ]);
    });

    it('should unsubscribe from changes', () => {
        const doc = Crdt.from<any>({
            a: 1,
            b: [2, {x: new Map([['value', 3]])}] as const,
            z: 'delete me',
        });

        const changes: ValueChange[] = [];
        const unsub = doc.onChange(x => {
            changes.push(...x);
        });

        doc.update(x => {
            x.a = 2;
        });

        unsub('test');

        doc.update(x => {
            x.a = 3;
        });

        expect(changes).toEqual([{path: ['a'], value: 2}]);
    });
});
