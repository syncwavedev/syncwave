import {Crdt, CrdtDiff} from './crdt/crdt';
import {Serializer} from './serializer';

export class CrdtSerializer<T> implements Serializer<Crdt<T>, Uint8Array> {
    encode(data: Crdt<T>): Uint8Array {
        return data.state();
    }
    decode(encoding: Uint8Array): Crdt<T> {
        return Crdt.load(encoding as CrdtDiff<T>);
    }
}
