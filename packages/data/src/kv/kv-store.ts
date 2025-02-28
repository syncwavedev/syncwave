import type {Codec} from '../codec.js';
import {AppError} from '../errors.js';
import {Stream, toStream} from '../stream.js';
import {tupleStartsWith, type Packer, type Tuple} from '../tuple.js';
import {unreachable} from '../utils.js';
import {IsolatedTransaction} from './isolated-kv-store.js';
import {MappedTransaction, type Mapper} from './mapped-mvcc-store.js';

export interface GtCondition<K> {
    readonly gt: K;
    readonly gte?: undefined;
    readonly lt?: undefined;
    readonly lte?: undefined;
}

export interface GteCondition<K> {
    readonly gt?: undefined;
    readonly gte: K;
    readonly lt?: undefined;
    readonly lte?: undefined;
}

export interface LtCondition<K> {
    readonly gt?: undefined;
    readonly gte?: undefined;
    readonly lt: K;
    readonly lte?: undefined;
}

export interface LteCondition<K> {
    readonly gt?: undefined;
    readonly gte?: undefined;
    readonly lt?: undefined;
    readonly lte: K;
}

export interface Entry<K, V> {
    readonly key: K;
    readonly value: V;
}

export type Uint8Entry = Entry<Uint8Array, Uint8Array>;
export type AppEntry<T = Uint8Array> = Entry<Tuple, T>;

export type Condition<K> =
    | GtCondition<K>
    | GteCondition<K>
    | LtCondition<K>
    | LteCondition<K>;

export class InvalidQueryCondition extends AppError {
    constructor(public readonly condition: Condition<unknown>) {
        super('invalid query condition');
    }
}

export interface ReadTransaction<K, V> {
    get(key: K): Promise<V | undefined>;
    query(condition: Condition<K>): AsyncIterable<Entry<K, V>>;
}

export interface Transaction<K, V> extends ReadTransaction<K, V> {
    put(key: K, value: V): Promise<void>;
    delete(key: K): Promise<void>;
}

export interface SingleWriterStore<K, V> {
    transactRead<TResult>(
        fn: (tx: ReadTransaction<K, V>) => Promise<TResult>
    ): Promise<TResult>;
    transactWrite<TResult>(
        fn: (tx: Transaction<K, V>) => Promise<TResult>
    ): Promise<TResult>;
    close(reason: unknown): void;
}

export interface MvccStore<K, V> {
    // fn must be called multiple times in case of a conflict (optimistic concurrency)
    transact<TResult>(
        fn: (tx: Transaction<K, V>) => Promise<TResult>
    ): Promise<TResult>;
    close(reason: unknown): void;
}

export type Uint8MvccStore = MvccStore<Uint8Array, Uint8Array>;
export type Uint8Transaction = Transaction<Uint8Array, Uint8Array>;
export type AppStore<T = Uint8Array> = MvccStore<Tuple, T>;
export type AppTransaction<T = Uint8Array> = Transaction<Tuple, T>;

export interface ConditionMapper<K, TResult> {
    gt: (cond: GtCondition<K>) => TResult;
    gte: (cond: GteCondition<K>) => TResult;
    lt: (cond: LtCondition<K>) => TResult;
    lte: (cond: LteCondition<K>) => TResult;
}

export function mapCondition<K, TResult>(
    condition: Condition<K>,
    mapper: ConditionMapper<K, TResult>
): TResult {
    if (condition.gt !== undefined) {
        return mapper.gt(condition as GtCondition<K>);
    } else if (condition.gte !== undefined) {
        return mapper.gte(condition as GteCondition<K>);
    } else if (condition.lt !== undefined) {
        return mapper.lt(condition as LtCondition<K>);
    } else if (condition.lte !== undefined) {
        return mapper.lte(condition as LteCondition<K>);
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
): <V>(store: Transaction<Tuple, V>) => Transaction<Tuple, V> {
    return store => new IsolatedTransaction(store, prefix);
}

export function withCodec<TData>(
    codec: Codec<TData>
): <K>(store: Transaction<K, Uint8Array>) => Transaction<K, TData> {
    return store =>
        new MappedTransaction(
            store,
            createIdMapper(),
            createCodecMapper(codec)
        );
}

export function withPacker<T>(
    codec: Packer<T>
): <V>(store: Transaction<Tuple, V>) => Transaction<T, V> {
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
