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

export type Mutation<TKey, TValue> = PutMutation<TKey, TValue> | DeleteMutation<TKey>;

export type Condition<TKey> = GtCondition<TKey> | GteCondition<TKey> | LtCondition<TKey> | LteCondition<TKey>;

export interface CursorNextValue<TKey, TValue> {
    readonly type: 'entry';
    readonly key: TKey;
    readonly value: TValue;
}

export interface CursorNextDone {
    readonly type: 'done';
}

export type CursorNext<TKey, TValue> = CursorNextDone | CursorNextValue<TKey, TValue>;

export interface Cursor<TKey, TValue> {
    next(): Promise<CursorNext<TKey, TValue>>;
    close(): Promise<void>;
}

export interface Crud<TKey, TValue> {
    get(key: TKey): Promise<TValue | undefined>;
    query(condition: Condition<TKey>): Promise<Cursor<TKey, TValue>>;
    put(key: TKey, value: TValue): Promise<void>;
}

export interface Transaction<TKey, TValue> extends Crud<TKey, TValue> {}

export interface KeyValueStore<TKey, TValue> extends Crud<TKey, TValue> {
    // fn must be called multiple times in case of a conflict (optimistic concurrency)
    transaction<TResult>(fn: (txn: Transaction<TKey, TValue>) => Promise<TResult>): Promise<TResult>;
}
