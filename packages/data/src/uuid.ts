import {parse, stringify, v7, validate} from 'uuid';
import {z} from 'zod';
import {Codec} from './codec.js';
import {Brand} from './utils.js';

export type Uuid = Brand<string, 'uuid'>;

export namespace Uuid {
    export const min = '00000000-0000-0000-0000-000000000000' as Uuid;
    export const max = 'ffffffff-ffff-ffff-ffff-ffffffffffff' as Uuid;
}

export function zUuid<TBrand extends Uuid>() {
    return z.custom<TBrand>(validate, {
        message: 'Invalid UUID format or incompatible with Uuid class',
    });
}

export function createUuid(): Uuid {
    return v7() as Uuid;
}

export class UuidCodec implements Codec<Uuid> {
    encode(data: Uuid): Uint8Array {
        return parse(data.toString());
    }
    decode(buf: Uint8Array): Uuid {
        const uuid = stringify(buf) as Uuid;
        if (!validate(uuid)) {
            throw new Error(`decode error: ${uuid} is not a UUID`);
        }

        return uuid;
    }
}
