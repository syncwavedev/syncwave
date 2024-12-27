import {Serializer} from './serializer';

export class StringSerializer implements Serializer<string, Uint8Array> {
    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    encode(data: string): Uint8Array<ArrayBufferLike> {
        return this.encoder.encode(data);
    }

    decode(encoding: Uint8Array<ArrayBufferLike>): string {
        return this.decoder.decode(encoding);
    }
}
