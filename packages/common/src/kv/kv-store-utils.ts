import {Serializer} from '../serializer';
import {concatBuffers} from '../utils';
import {Transaction} from './key-value-store';
import {MappedTransaction, Mapper} from './mapped-key-value-store';

function createPrefixMapper(prefix: Uint8Array | string): Mapper<Uint8Array, Uint8Array> {
    const prefixBuf = typeof prefix === 'string' ? encodeString(prefix) : prefix;

    return {
        decode(key) {
            return key.slice(prefixBuf.length);
        },
        encode(key) {
            return concatBuffers(prefixBuf, key);
        },
    };
}

function createIdMapper<T>(): Mapper<T, T> {
    return {
        decode: x => x,
        encode: x => x,
    };
}

function createSerializationMapper<TData, TEncoding>(
    serializer: Serializer<TData, TEncoding>
): Mapper<TEncoding, TData> {
    return {
        encode: serializer.encode.bind(serializer),
        decode: serializer.decode.bind(serializer),
    };
}

export function withPrefix(
    prefix: Uint8Array | string
): <TValue>(store: Transaction<Uint8Array, TValue>) => Transaction<Uint8Array, TValue> {
    return store => new MappedTransaction(store, createPrefixMapper(prefix), createIdMapper());
}

export function withValueSerializer<TData, TEncoding>(
    serializer: Serializer<TData, TEncoding>
): <TKey>(store: Transaction<TKey, TEncoding>) => Transaction<TKey, TData> {
    return store => new MappedTransaction(store, createIdMapper(), createSerializationMapper(serializer));
}

export function withKeySerializer<TData, TEncoding>(
    serializer: Serializer<TData, TEncoding>
): <TValue>(store: Transaction<TEncoding, TValue>) => Transaction<TData, TValue> {
    return store => new MappedTransaction(store, createSerializationMapper(serializer), createIdMapper());
}

const decoder = new TextDecoder();
export function decodeString(buffer: Uint8Array) {
    return decoder.decode(buffer);
}

const encoder = new TextEncoder();
export function encodeString(s: string) {
    return encoder.encode(s);
}
