export interface Serializer<TData, TEncoding> {
    encode(data: TData): TEncoding;
    decode(encoding: TEncoding): TData;
}
