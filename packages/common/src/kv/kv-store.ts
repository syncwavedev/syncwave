import {Encoder} from '../encoder';
import {concatBuffers, unreachable} from '../utils';
import {MappedTransaction, Mapper} from './mapped-kv-store';
import {PrefixedTransaction} from './prefixed-kv-store';

export interface GtCondition<TKey> {
    readonly gt: TKey;
    readonly gte?: undefined;
    readonly lt?: undefined;
    readonly lte?: undefined;
}

export interface GteCondition<TKey> {
    readonly gt?: undefined;
    readonly gte: TKey;
    readonly lt?: undefined;
    readonly lte?: undefined;
}

export interface LtCondition<TKey> {
    readonly gt?: undefined;
    readonly gte?: undefined;
    readonly lt: TKey;
    readonly lte?: undefined;
}

export interface LteCondition<TKey> {
    readonly gt?: undefined;
    readonly gte?: undefined;
    readonly lt?: undefined;
    readonly lte: TKey;
}

export interface PutMutation<TKey, TValue> {
    readonly type: 'put';
    readonly key: TKey;
    readonly value: TValue;
}

export interface DeleteMutation<TKey> {
    readonly type: 'delete';
    readonly key: TKey;
}

export interface Entry<TKey, TValue> {
    readonly key: TKey;
    readonly value: TValue;
}

export type Mutation<TKey, TValue> = PutMutation<TKey, TValue> | DeleteMutation<TKey>;

export type Condition<TKey> = GtCondition<TKey> | GteCondition<TKey> | LtCondition<TKey> | LteCondition<TKey>;

export class InvalidQueryCondition extends Error {
    constructor(public readonly condition) {
        super('invalid query condition');
    }
}

export interface Transaction<TKey, TValue> {
    get(key: TKey): Promise<TValue | undefined>;
    query(condition: Condition<TKey>): AsyncIterable<Entry<TKey, TValue>>;
    put(key: TKey, value: TValue): Promise<void>;
    delete(key: TKey): Promise<void>;
}

export interface KVStore<TKey, TValue> {
    // fn must be called multiple times in case of a conflict (optimistic concurrency)
    transaction<TResult>(fn: (txn: Transaction<TKey, TValue>) => Promise<TResult>): Promise<TResult>;
}

export type Uint8KVStore = KVStore<Uint8Array, Uint8Array>;
export type Uint8Transaction = Transaction<Uint8Array, Uint8Array>;

export interface ConditionMapper<TKey, TResult> {
    gt: (cond: GtCondition<TKey>) => TResult;
    gte: (cond: GteCondition<TKey>) => TResult;
    lt: (cond: LtCondition<TKey>) => TResult;
    lte: (cond: LteCondition<TKey>) => TResult;
}

export function mapCondition<TKey, TResult>(
    condition: Condition<TKey>,
    mapper: ConditionMapper<TKey, TResult>
): TResult {
    if (condition.gt !== undefined) {
        return mapper.gt(condition as GtCondition<TKey>);
    } else if (condition.gte !== undefined) {
        return mapper.gte(condition as GteCondition<TKey>);
    } else if (condition.lt !== undefined) {
        return mapper.lt(condition as LtCondition<TKey>);
    } else if (condition.lte !== undefined) {
        return mapper.lte(condition as LteCondition<TKey>);
    } else {
        return unreachable();
    }
}

// utils

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

function createEncodingMapper<TData>(encoder: Encoder<TData>): Mapper<Uint8Array, TData> {
    return {
        encode: encoder.encode.bind(encoder),
        decode: encoder.decode.bind(encoder),
    };
}

export function withPrefix(
    prefix: Uint8Array | string
): <TValue>(store: Transaction<Uint8Array, TValue>) => Transaction<Uint8Array, TValue> {
    return store => new PrefixedTransaction(store, prefix);
}

export function withValueEncoder<TData>(
    encoder: Encoder<TData>
): <TKey>(store: Transaction<TKey, Uint8Array>) => Transaction<TKey, TData> {
    return store => new MappedTransaction(store, createIdMapper(), createEncodingMapper(encoder));
}

export function withKeyEncoder<TData>(
    encoder: Encoder<TData>
): <TValue>(store: Transaction<Uint8Array, TValue>) => Transaction<TData, TValue> {
    return store => new MappedTransaction(store, createEncodingMapper(encoder), createIdMapper());
}

const decoder = new TextDecoder();
export function decodeString(buffer: Uint8Array) {
    return decoder.decode(buffer);
}

const encoder = new TextEncoder();
export function encodeString(s: string) {
    return encoder.encode(s);
}
