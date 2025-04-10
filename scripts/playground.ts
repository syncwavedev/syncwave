/* eslint-disable no-console */
import {Type} from '@sinclair/typebox';
import {Check} from '@sinclair/typebox/value';

const Schema = Type.Object({
    value: Type.Union([Type.Number(), Type.Undefined()]),
});

console.log(Check(Schema, {}));
