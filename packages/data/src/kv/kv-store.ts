import type {Codec} from '../codec.js';
import {AppError} from '../errors.js';
import {Stream, toStream} from '../stream.js';
import {tupleStartsWith, type Packer, type Tuple} from '../tuple.js';
import {unreachable} from '../utils.js';
import {IsolatedTransaction} from './isolated-kv-store.js';
import {MappedTransaction, type Mapper} from './mapped-kv-store.js';

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
export type AppEntry<T = Uint8Array> = Entry<Tuple, T>;

export type Mutation<TKey, TValue> =
    | PutMutation<TKey, TValue>
    | DeleteMutation<TKey>;

export type Condition<TKey> =
    | GtCondition<TKey>
    | GteCondition<TKey>
    | LtCondition<TKey>
    | LteCondition<TKey>;

export class InvalidQueryCondition extends AppError {
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
    close(): void;
}

export type Uint8KVStore = KVStore<Uint8Array, Uint8Array>;
export type Uint8Transaction = Transaction<Uint8Array, Uint8Array>;
export type AppStore<T = Uint8Array> = KVStore<Tuple, T>;
export type AppTransaction<T = Uint8Array> = Transaction<Tuple, T>;

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

function createPackerMapper<TData>(codec: Packer<TData>): Mapper<Tuple, TData> {
    return {
        encode: codec.pack.bind(codec),
        decode: codec.unpack.bind(codec),
    };
}

function createCodecMapper<TData>(
    codec: Codec<TData>
): Mapper<Uint8Array, TData> {
    return {
        encode: codec.encode.bind(codec),
        decode: codec.decode.bind(codec),
    };
}

export function isolate(
    prefix: Tuple
): <TValue>(store: Transaction<Tuple, TValue>) => Transaction<Tuple, TValue> {
    return store => new IsolatedTransaction(store, prefix);
}

export function withCodec<TData>(
    codec: Codec<TData>
): <TKey>(store: Transaction<TKey, Uint8Array>) => Transaction<TKey, TData> {
    return store =>
        new MappedTransaction(
            store,
            createIdMapper(),
            createCodecMapper(codec)
        );
}

export function withPacker<T>(
    codec: Packer<T>
): <TValue>(store: Transaction<Tuple, TValue>) => Transaction<T, TValue> {
    return store =>
        new MappedTransaction(
            store,
            createPackerMapper(codec),
            createIdMapper()
        );
}

export function queryStartsWith<T>(
    tx: AppTransaction<T>,
    prefix: Tuple
): Stream<Entry<Tuple, T>> {
    return toStream(_queryStartsWith(tx, prefix));
}

async function* _queryStartsWith<T>(
    tx: AppTransaction<T>,
    prefix: Tuple
): AsyncIterable<Entry<Tuple, T>> {
    for await (const entry of tx.query({gte: prefix})) {
        if (!tupleStartsWith(entry.key, prefix)) {
            return;
        }

        yield entry;
    }
}
