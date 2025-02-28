import {FormatRegistry, Type, type TSchema} from '@sinclair/typebox';
import {Parse} from '@sinclair/typebox/value';
import {validateBase64} from './base64.js';
import {AppError, toError} from './errors.js';
import {validateUuid} from './uuid.js';

export type InferSchema<T> = TSchema & {static: T};

FormatRegistry.Set('uuid', value => validateUuid(value));
FormatRegistry.Set('base64', value => validateBase64(value));

export function parseValue<T>(schema: InferSchema<T>, x: unknown): T {
    try {
        return Parse(schema, x);
    } catch (error) {
        throw toError(new AppError('Parse error', {cause: error}));
    }
}

export function zUint8Array() {
    return Type.Uint8Array();
}
