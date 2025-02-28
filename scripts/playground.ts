/* eslint-disable */
import {Type} from '@sinclair/typebox';
import {TypeCompiler} from '@sinclair/typebox/compiler';
import {Parse} from '@sinclair/typebox/value';

import Ajv from 'ajv';
import {createUuid} from '../packages/data/src/uuid.js';

const ajv = new Ajv({});

const schema = Type.Object({
    uuid: Type.String({
        format: 'uuid',
    }),
    buf: Type.Uint8Array(),
});
const C = TypeCompiler.Compile(schema);

// const validate = ajv.compile(schema);

const val = Parse(schema, {
    uuid: createUuid(),
    buf: new Uint8Array([1, 2, 3]),
});

console.log(typeof val, val);
