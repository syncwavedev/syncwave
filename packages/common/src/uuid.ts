import {parse, stringify, v7} from 'uuid';
import {Serializer} from './serializer';

export class Uuid {
    public readonly __type: 'uuid' = 'uuid';

    constructor(private readonly uuid) {}

    toString() {
        return this.uuid;
    }
}

export function createUuid(): Uuid {
    return new Uuid(v7());
}

export class UuidSerializer implements Serializer<Uuid, Uint8Array> {
    encode(data: Uuid): Uint8Array {
        return parse(data.toString());
    }
    decode(encoding: Uint8Array): Uuid {
        return new Uuid(stringify(encoding));
    }
}
