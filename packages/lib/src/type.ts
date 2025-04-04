import {FormatRegistry, type TSchema} from '@sinclair/typebox';
import {TypeCheck, TypeCompiler} from '@sinclair/typebox/compiler';
import {validateBase64} from './base64.js';
import {AppError, getReadableError, toError} from './errors.js';
import {validateUuid} from './uuid.js';

export type ToSchema<T> = TSchema & {static: T};

FormatRegistry.Set('uuid', value => validateUuid(value));
FormatRegistry.Set('base64', value => validateBase64(value));

const typeCheckCache = new WeakMap<{}, TypeCheck<any>>();

function createTypeCheck<T extends TSchema>(schema: T): TypeCheck<T> {
    const cached = typeCheckCache.get(schema);
    if (cached) {
        return cached as TypeCheck<T>;
    }
    const result = TypeCompiler.Compile(schema);
    typeCheckCache.set(schema, result);
    return result;
}

export function checkValue<T>(schema: ToSchema<T>, x: unknown): T {
    const typeCheck = createTypeCheck(schema);
    try {
        if (typeCheck.Check(x)) {
            return x;
        }

        const errors = [...typeCheck.Errors(x)];

        throw new AppError(
            'validation failed:\n - ' +
                errors.map(e => e.message).join('\n - '),
            {cause: errors}
        );
    } catch (error) {
        throw toError(
            new AppError('Check error: ' + getReadableError(error), {
                cause: error,
            })
        );
    }
}
