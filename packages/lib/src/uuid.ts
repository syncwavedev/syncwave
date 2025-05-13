import {Type} from '@sinclair/typebox';
import {v4, v7, validate} from 'uuid';
import {AppError} from './errors.js';
import type {Brand} from './utils.js';

export type Uuid = Brand<string, 'uuid'>;

export function Uuid<TBrand extends Uuid>() {
    return Type.Unsafe<TBrand>(Type.String({format: 'uuid'}));
}

export namespace Uuid {
    export const min = '00000000-0000-0000-0000-000000000000' as Uuid;
    export const max = 'ffffffff-ffff-ffff-ffff-ffffffffffff' as Uuid;
}

export function validateUuid(value: unknown): value is Uuid {
    return validate(value);
}

export function createUuid(): Uuid {
    return v7() as Uuid;
}

export function createUuidV4() {
    return v4() as Uuid;
}

export function stringifyUuid(uuid: Uuid): string {
    return uuid;
}

export function parseUuid(uuid: string): Uuid {
    if (!validate(uuid)) {
        throw new AppError(`parse error: ${uuid} is not a UUID`);
    }
    return uuid as Uuid;
}
