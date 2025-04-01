import {describe, expect, it} from 'vitest';
import {assert} from '../utils.js';
import {type OpLog, observe} from './observe.js';

describe('observe', () => {
    interface Testcase<T> {
        subject: T;
        recipe: (value: T) => void;
        expected: OpLog;
    }

    function tc(
        subject: any,
        recipe: (value: any) => void,
        expected: (subject: any) => OpLog
    ): Testcase<any> {
        return {
            subject,
            recipe,
            expected: expected(subject),
        };
    }

    const testcases: Array<Testcase<any>> = [
        tc(
            {},
            x => (x.a = 1),
            x => [{type: 'object_set', subject: x, prop: 'a', value: 1}]
        ),
        tc(
            {a: 1},
            x => (x.a = 2),
            x => [{type: 'object_set', subject: x, prop: 'a', value: 2}]
        ),
        tc(
            {a: 1},
            x => delete x.a,
            x => [{type: 'object_delete', subject: x, prop: 'a'}]
        ),
        tc(
            [],
            x => x.push(1, 2),
            x => [{type: 'array_push', subject: x, args: [1, 2]}]
        ),
        tc(
            [],
            x => x.unshift(1, 2, 3),
            x => [{type: 'array_unshift', subject: x, args: [1, 2, 3]}]
        ),
        tc(
            [],
            x => {
                x.concat([]);
            },
            () => []
        ),
        tc(
            [{}],
            x => (x[0].val = 'new'),
            x => [
                {type: 'object_set', subject: x[0], prop: 'val', value: 'new'},
            ]
        ),
        tc(
            [1, 2, 3],
            x => (x[2] = 'val'),
            x => [{type: 'array_set', subject: x, index: 2, value: 'val'}]
        ),
        tc(
            new Map(),
            x => x.set('k', 'v'),
            x => [{type: 'map_set', subject: x, args: ['k', 'v']}]
        ),
        tc(
            new Map(),
            x => {
                x.set('k', {});
                x.get('k').v = 'great';

                assert(x.get('k').v === 'great', 'should be true');
            },
            x => [
                {type: 'map_set', subject: x, args: ['k', {}]},
                {type: 'object_set', subject: {}, prop: 'v', value: 'great'},
            ]
        ),
        tc(
            new Map([['k', 'v']]),
            x => x.delete('k'),
            x => [{type: 'map_delete', subject: x, args: ['k']}]
        ),
        tc(
            new Map([
                ['k1', 'v1'],
                ['k2', 'v2'],
            ]),
            x => x.clear(),
            x => [{type: 'map_clear', subject: x, args: []}]
        ),
    ];

    testcases.forEach((testcase, idx) => {
        it(idx + 1 + '. records updates', () => {
            const [, log] = observe(testcase.subject, testcase.recipe);

            expect(log).toEqual(testcase.expected);
        });
    });
});

describe('observe function', () => {
    it('should observe object property sets', () => {
        const initialObject: any = {name: 'Alice', age: 25};
        const [result, log] = observe(initialObject, obj => {
            obj.name = 'Bob';
            obj.age = 30;
            return obj;
        });

        expect(result.name).toBe('Bob');
        expect(result.age).toBe(30);

        expect(log.length).toBe(2);
        assert(log[0].type === 'object_set', 'log[0] is not object_set');
        expect(log[0].prop).toBe('name');
        expect(log[0].value).toBe('Bob');
        assert(log[1].type === 'object_set', 'log[1] is not object_set');
        expect(log[1].prop).toBe('age');
        expect(log[1].value).toBe(30);
    });

    it('should observe object property deletions', () => {
        const initialObject: any = {name: 'Alice', age: 25};
        const [result, log] = observe(initialObject, obj => {
            delete obj.age;
            return obj;
        });

        expect(result.name).toBe('Alice');
        expect(result.age).toBeUndefined();

        // log should contain one object_delete entry
        expect(log.length).toBe(1);
        assert(log[0].type === 'object_delete', 'log[0] is not object_delete');
        expect(log[0].prop).toBe('age');
    });

    it('should observe array pushes and sets', () => {
        const initialArray = [1, 2, 3];
        const [result, log] = observe(initialArray, arr => {
            arr.push(4);
            arr[1] = 20; // sets index=1
            return arr;
        });

        expect([...result]).toEqual([1, 20, 3, 4]);
        expect(result.length).toBe(4);

        expect(log.length).toBe(2);

        assert(log[0].type === 'array_push', 'log[0] is not array_push');
        expect(log[0].args).toEqual([4]);

        assert(log[1].type === 'array_set', 'log[1] is not array_set');
        expect(log[1].index).toBe(1);
        expect(log[1].value).toBe(20);
    });

    it('should observe array unshifts', () => {
        const initialArray = ['b', 'c'];
        const [result, log] = observe(initialArray, arr => {
            arr.unshift('a');
            return arr;
        });

        expect([...result]).toEqual(['a', 'b', 'c']);

        expect(log.length).toBe(1);
        assert(log[0].type === 'array_unshift', 'log[0] is not array_unshift');
        expect(log[0].args).toEqual(['a']);
    });

    it('should throw on unsupported array modifications like pop()', () => {
        const [_, log] = observe([1, 2, 3], arr => {
            expect(() => {
                arr.pop();
            }).toThrowError('unsupported array modification: pop');
            return arr;
        });
        // pop did not succeed, so log should be empty
        expect(log).toEqual([]);
    });

    it('should observe map set/delete/clear', () => {
        const map = new Map<string, number>([
            ['a', 1],
            ['b', 2],
        ]);

        const [result, log] = observe(map, proxyMap => {
            proxyMap.set('c', 3);
            proxyMap.delete('b');
            proxyMap.clear();
            return proxyMap;
        });

        expect(result.size).toBe(0);

        expect(log.length).toBe(3);
        assert(log[0].type === 'map_set', 'log[0] is not map_set');
        expect(log[0].args).toEqual(['c', 3]);
        assert(log[1].type === 'map_delete', 'log[1] is not map_delete');
        expect(log[1].args).toEqual(['b']);
        assert(log[2].type === 'map_clear', 'log[2] is not map_clear');
        expect(log[2].args).toEqual([]);
    });

    it("should return the recipe's return value and the log", () => {
        const [result, log] = observe({test: true}, obj => {
            obj.test = false;
            return 'some-result';
        });

        expect(result).toBe('some-result');
        expect(log.length).toBe(1);
        assert(log[0].type === 'object_set', 'log[0] is not object_set');
        expect(log[0].prop).toBe('test');
        expect(log[0].value).toBe(false);
    });
});
