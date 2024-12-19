import {KVStore} from './contracts/key-value-store';
import {Serializer} from './contracts/serializer';
import {MappedKVStore, Mapper} from './mapped-key-value-store';
import {concatBuffers} from './utils';

function createPrefixMapper(prefix: Uint8Array | string): Mapper<Uint8Array, Uint8Array> {
    prefix = typeof prefix === 'string' ? encodeString(prefix) : prefix;

    return {
        decode(key) {
            return key.slice(prefix.length);
        },
        encode(key) {
            return concatBuffers(prefix, key);
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

export function withPrefix<TValue>(
    prefix: Uint8Array | string
): (store: KVStore<Uint8Array, TValue>) => KVStore<Uint8Array, TValue> {
    return store => new MappedKVStore(store, createPrefixMapper(prefix), createIdMapper());
}

export function withValueSerializer<TKey, TData, TEncoding>(
    serializer: Serializer<TData, TEncoding>
): (store: KVStore<TKey, TEncoding>) => KVStore<TKey, TData> {
    return store => new MappedKVStore(store, createIdMapper(), createSerializationMapper(serializer));
}

export function withKeySerializer<TValue, TData, TEncoding>(
    serializer: Serializer<TData, TEncoding>
): (store: KVStore<TEncoding, TValue>) => KVStore<TData, TValue> {
    return store => new MappedKVStore(store, createSerializationMapper(serializer), createIdMapper());
}

const decoder = new TextDecoder();
export function decodeString(buffer: Uint8Array) {
    return decoder.decode(buffer);
}

const encoder = new TextEncoder();
export function encodeString(s: string) {
    return encoder.encode(s);
}
