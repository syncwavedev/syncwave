export interface Serializer {
    encode(data: unknown): Uint8Array;
    decode(buffer: Uint8Array): any;
}
