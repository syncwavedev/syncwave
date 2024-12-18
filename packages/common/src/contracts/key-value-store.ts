import {Result} from '../result';

export interface GtCondition<TKey> {
    gt: TKey;
    gte?: undefined;
    lt?: undefined;
    lte?: undefined;
}

export interface GteCondition<TKey> {
    gt?: undefined;
    gte: TKey;
    lt?: undefined;
    lte?: undefined;
}

export interface LtCondition<TKey> {
    gt?: undefined;
    gte?: undefined;
    lt: TKey;
    lte?: undefined;
}

export interface LteCondition<TKey> {
    gt?: undefined;
    gte?: undefined;
    lt?: undefined;
    lte: TKey;
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

export type Mutation<TKey, TValue> = PutMutation<TKey, TValue> | DeleteMutation<TKey>;

export type Condition<TKey> = GtCondition<TKey> | GteCondition<TKey> | LtCondition<TKey> | LteCondition<TKey>;

export interface CursorNextValue<TKey, TValue> {
    type: 'entry';
    key: TKey;
    value: TValue;
}

export interface CursorNextDone {
    type: 'done';
}

export type CursorNext<TKey, TValue> = CursorNextDone | CursorNextValue<TKey, TValue>;

export interface Cursor<TKey, TValue> {
    next(): Promise<Result<unknown, CursorNext<TKey, TValue>>>;
    close(): Promise<Result<unknown, void>>;
}

export interface Crud<TKey, TValue> {
    get(key: TKey): Promise<Result<unknown, TValue>>;
    query(condition: Condition<TKey>): Promise<Result<unknown, Cursor<TKey, TValue>>>;
    put(key: TKey, value: TValue): Promise<Result<unknown, void>>;
}

export interface Transaction<TKey, TValue> extends Crud<TKey, TValue> {}

export interface KeyValueStore<TKey, TValue> extends Crud<TKey, TValue> {
    // fn must be called multiple times in case of a conflict (optimistic concurrency)
    transaction<TResult>(
        fn: (txn: Transaction<TKey, TValue>) => Promise<Result<unknown, TResult>>
    ): Promise<Result<unknown, TResult>>;
}
