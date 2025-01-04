import {Condition, Cursor, CursorNext, KVStore, Transaction} from './kv-store';

export class CursorProxy<TKey, TValue> implements Cursor<TKey, TValue> {
    constructor(
        private target: Cursor<TKey, TValue>,
        private handler: KVStoreProxyHandler<TKey, TValue>
    ) {}

    next(): Promise<CursorNext<TKey, TValue>> {
        if (this.handler.next) {
            return this.handler.next(this.target);
        }

        return this.target.next();
    }

    close(): Promise<void> {
        if (this.handler.close) {
            return this.handler.close(this.target);
        }

        return this.target.close();
    }
}

export class TransactionProxy<TKey, TValue> implements Transaction<TKey, TValue> {
    constructor(
        private target: Transaction<TKey, TValue>,
        private handler: KVStoreProxyHandler<TKey, TValue>
    ) {}

    get(key: TKey): Promise<TValue | undefined> {
        if (this.handler.get) {
            return this.handler.get(this.target, key);
        }

        return this.target.get(key);
    }

    query(condition: Condition<TKey>): Promise<Cursor<TKey, TValue>> {
        if (this.handler.query) {
            return this.handler.query(this.target, condition);
        }

        return this.target.query(condition);
    }

    put(key: TKey, value: TValue): Promise<void> {
        if (this.handler.put) {
            return this.handler.put(this.target, key, value);
        }

        return this.target.put(key, value);
    }
}

export interface KVStoreProxyHandler<TKey, TValue> {
    next?(target: Cursor<TKey, TValue>): Promise<CursorNext<TKey, TValue>>;
    close?(target: Cursor<TKey, TValue>): Promise<void>;

    get?(target: Transaction<TKey, TValue>, key: TKey): Promise<TValue | undefined>;
    query?(target: Transaction<TKey, TValue>, condition: Condition<TKey>): Promise<Cursor<TKey, TValue>>;
    put?(target: Transaction<TKey, TValue>, key: TKey, value: TValue): Promise<void>;

    transaction?<TResult>(
        target: KVStore<TKey, TValue>,
        fn: (txn: Transaction<TKey, TValue>) => Promise<TResult>
    ): Promise<TResult>;
}

export class KVStoreProxy<TKey, TValue> implements KVStore<TKey, TValue> {
    constructor(
        private target: KVStore<TKey, TValue>,
        private handler: KVStoreProxyHandler<TKey, TValue>
    ) {}

    async transaction<TResult>(fn: (txn: Transaction<TKey, TValue>) => Promise<TResult>): Promise<TResult> {
        const originalFn = fn;
        fn = txn => originalFn(new TransactionProxy(txn, this.handler));

        if (this.handler.transaction) {
            return this.handler.transaction(this.target, fn);
        }

        return this.target.transaction(fn);
    }
}
