import {assert, describe, expect, it} from 'vitest';
import {MsgpackrSerializer} from './msgpackr-serializer';
import {compareUint8Array} from './utils';
import {Uuid, createUuid} from './uuid';

describe('MsgPackrSerializer', () => {
    const serializer = new MsgpackrSerializer();

    interface Testcase {
        name: string;
        a: any;
        b: any;
        result: -1 | 0 | 1;
    }

    const testcases: Testcase[] = [
        {name: '"a" < "b"', a: 'a', b: 'b', result: -1},
        {name: '[1, 2] < [2, 0]', a: [1, 2], b: [2, 0], result: -1},
        {name: '[1, undefined] > [1, 2]', a: [1, undefined], b: [1, 2], result: 1},
        {name: '[1, 2] > [2]', a: [1, 2], b: [2], result: 1},
        {name: '[1, 2, 3] > [1, 2]', a: [1, 2, 3], b: [1, 2], result: 1},
    ];

    testcases.forEach(({a, b, name, result}) => {
        it(name, () => {
            expect(compareUint8Array(serializer.encode(a), serializer.encode(b))).toEqual(result);
        });
    });

    it('should ser/de uuid', () => {
        const uuid = createUuid();
        const buf = serializer.encode(uuid);
        const result = serializer.decode(buf);

        assert(result instanceof Uuid);
        expect(uuid).toEqual(result);
    });
});
