import {applyUpdateV2, Doc, encodeStateAsUpdateV2} from 'yjs';
import {Serializer} from './contracts/serializer';

export class YjsSerializer implements Serializer<Doc, Uint8Array> {
    encode(data: Doc): Uint8Array {
        return encodeStateAsUpdateV2(data);
    }
    decode(encoding: Uint8Array): Doc {
        const doc = new Doc();
        applyUpdateV2(doc, encoding);
        return doc;
    }
}
