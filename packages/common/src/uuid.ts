import {inspect} from 'util';
import {parse, stringify, v7} from 'uuid';
import {Encoder} from './encoder';

export class Uuid {
    public readonly __type: 'uuid' = 'uuid';

    constructor(private readonly uuid) {}

    toString() {
        return this.uuid;
    }

    valueOf() {
        return this.uuid;
    }

    toJSON() {
        return this.uuid;
    }

    [inspect.custom]() {
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

export function createUuid(): Uuid {
    return new Uuid(v7());
}

export class UuidEncoder implements Encoder<Uuid> {
    encode(data: Uuid): Uint8Array {
        return parse(data.toString());
    }
    decode(buf: Uint8Array): Uuid {
        return new Uuid(stringify(buf));
    }
}
