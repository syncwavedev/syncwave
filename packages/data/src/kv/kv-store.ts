import {astream, AsyncStream} from '../async-stream.js';
import {Codec} from '../codec.js';
import {bufStartsWith, unreachable} from '../utils.js';
import {MappedTransaction, Mapper} from './mapped-kv-store.js';
import {PrefixedTransaction} from './prefixed-kv-store.js';

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

export type Uint8Entry = Entry<Uint8Array, Uint8Array>;

export type Mutation<TKey, TValue> =
    | PutMutation<TKey, TValue>
    | DeleteMutation<TKey>;

export type Condition<TKey> =
    | GtCondition<TKey>
    | GteCondition<TKey>
    | LtCondition<TKey>
    | LteCondition<TKey>;

export class InvalidQueryCondition extends Error {
    constructor(public readonly condition: Condition<unknown>) {
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
    transact<TResult>(
        fn: (tx: Transaction<TKey, TValue>) => Promise<TResult>
    ): Promise<TResult>;
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

function createIdMapper<T>(): Mapper<T, T> {
    return {
        decode: x => x,
        encode: x => x,
    };
}

function createEncodingMapper<TData>(
    codec: Codec<TData>
): Mapper<Uint8Array, TData> {
    return {
        encode: codec.encode.bind(codec),
        decode: codec.decode.bind(codec),
    };
}

export function withPrefix(
    prefix: Uint8Array | string
): <TValue>(
    store: Transaction<Uint8Array, TValue>
) => Transaction<Uint8Array, TValue> {
    return store => new PrefixedTransaction(store, prefix);
}

export function withValueCodec<TData>(
    codec: Codec<TData>
): <TKey>(store: Transaction<TKey, Uint8Array>) => Transaction<TKey, TData> {
    return store =>
        new MappedTransaction(
            store,
            createIdMapper(),
            createEncodingMapper(codec)
        );
}

export function withKeyCodec<TData>(
    codec: Codec<TData>
): <TValue>(
    store: Transaction<Uint8Array, TValue>
) => Transaction<TData, TValue> {
    return store =>
        new MappedTransaction(
            store,
            createEncodingMapper(codec),
            createIdMapper()
        );
}

export function queryStartsWith<T>(
    tx: Transaction<Uint8Array, T>,
    prefix: Uint8Array
): AsyncStream<Entry<Uint8Array, T>> {
    return astream(_queryStartsWith(tx, prefix));
}

async function* _queryStartsWith<T>(
    tx: Transaction<Uint8Array, T>,
    prefix: Uint8Array
): AsyncIterable<Entry<Uint8Array, T>> {
    const stream = tx.query({gte: prefix});
    for await (const entry of stream) {
        if (!bufStartsWith(entry.key, prefix)) {
            return;
        }

        yield entry;
    }
}
