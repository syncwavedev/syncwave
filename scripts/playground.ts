/* eslint-disable */
import {Type} from '@sinclair/typebox';

import {decodeMsgpack, encodeMsgpack} from '../packages/data/src/codec.js';
import {parseValue} from '../packages/data/src/type.js';

const x = parseValue(
    Type.Object({
        x: Type.Uint8Array(),
    }),
    decodeMsgpack(encodeMsgpack({x: new Uint8Array([1, 2, 3])}))
);

console.log(x);
