import {parse, stringify, v7, validate} from 'uuid';
import {z} from 'zod';
import {Codec} from './codec.js';

export class Uuid {
    public readonly __type = 'uuid' as const;

    public static min = new Uuid('00000000-0000-0000-0000-000000000000');
    public static max = new Uuid('ffffffff-ffff-ffff-ffff-ffffffffffff');

    constructor(private readonly uuid: string) {
        if (!validate(uuid)) {
            throw new Error('invalid uuid: ' + uuid);
        }
    }

    toString() {
        return this.uuid;
    }

    valueOf() {
        return this.uuid;
    }

    toJSON() {
        return this.uuid;
    }

    equals(uuid: Uuid): boolean {
        return this.uuid === uuid.uuid;
    }

    compare(x: Uuid): 1 | 0 | -1 {
        if (this.uuid < x.uuid) {
            return -1;
        } else if (this.uuid > x.uuid) {
            return 1;
        } else {
            return 0;
        }
    }
}

export function zUuid<TBrand extends Uuid>() {
    return z.custom<TBrand>(value => value instanceof Uuid, {
        message: 'Invalid UUID format or incompatible with Uuid class',
    });
}

export function createUuid(): Uuid {
    return new Uuid(v7());
}

export class UuidCodec implements Codec<Uuid> {
    encode(data: Uuid): Uint8Array {
        return parse(data.toString());
    }
    decode(buf: Uint8Array): Uuid {
        return new Uuid(stringify(buf));
    }
}
