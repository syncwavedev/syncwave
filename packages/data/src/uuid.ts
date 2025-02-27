import {Type} from '@sinclair/typebox';
import {parse, stringify, v4, v7, validate} from 'uuid';
import type {Codec} from './codec.js';
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

export function createUuid(): Uuid {
    return v7() as Uuid;
}

export function createUuidV4() {
    return v4() as Uuid;
}

export class UuidCodec implements Codec<Uuid> {
    encode(data: Uuid): Uint8Array {
        return parse(data);
    }
    decode(buf: Uint8Array): Uuid {
        const uuid = stringify(buf) as Uuid;
        if (!validate(uuid)) {
            throw new AppError(`decode error: ${uuid} is not a UUID`);
        }

        return uuid;
    }
}

const uuidCodec = new UuidCodec();
export const encodeUuid = (data: Uuid) => uuidCodec.encode(data);
export const decodeUuid = (buf: Uint8Array) => uuidCodec.decode(buf);

export function stringifyUuid(uuid: Uuid): string {
    return uuid;
}

export function parseUuid(uuid: string): Uuid {
    if (!validate(uuid)) {
        throw new AppError(`parse error: ${uuid} is not a UUID`);
    }
    return uuid as Uuid;
}
