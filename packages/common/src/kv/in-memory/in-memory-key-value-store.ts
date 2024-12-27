import createTree, {Iterator, Tree} from 'functional-red-black-tree';
import {Condition, Cursor, CursorNext, InvalidQueryCondition, KVStore, Transaction} from '../key-value-store';
import {InMemoryLocker} from './in-memory-locker';
import {Locker} from './locker';

function compareUint8Array(a: Uint8Array, b: Uint8Array): 1 | 0 | -1 {
    const minLength = Math.min(a.length, b.length);

    for (let i = 0; i < minLength; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
    }

    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;

    return 0;
}

export class CursorClosedError extends Error {
    constructor() {
        super('cursor is closed');
    }
}

export class InMemoryKeyValueCursor implements Cursor<Uint8Array, Uint8Array> {
    private closed = false;

    constructor(private iterator: Iterator<Uint8Array, Uint8Array>) {}

    async next(): Promise<CursorNext<Uint8Array, Uint8Array>> {
        if (this.closed) {
            throw new CursorClosedError();
        }

        let result: CursorNext<Uint8Array, Uint8Array>;

        if (this.iterator.valid) {
            result = {
                type: 'entry',
                key: this.iterator.key!,
                value: this.iterator.value!,
            };

            this.iterator.next();
        } else {
            result = {
                type: 'done',
            };
        }

        return result;
    }

    async close(): Promise<void> {
        this.closed = true;
    }
}

export class InMemoryTransaction implements Transaction<Uint8Array, Uint8Array> {
    constructor(public tree: Tree<Uint8Array, Uint8Array>) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        return this.tree.get(key) ?? undefined;
    }

    async query(condition: Condition<Uint8Array>): Promise<Cursor<Uint8Array, Uint8Array>> {
        if (condition.gt) {
            return new InMemoryKeyValueCursor(this.tree.gt(condition.gt));
        } else if (condition.gte) {
            return new InMemoryKeyValueCursor(this.tree.ge(condition.gte));
        } else if (condition.lt) {
            return new InMemoryKeyValueCursor(this.tree.lt(condition.lt));
        } else if (condition.lte) {
            return new InMemoryKeyValueCursor(this.tree.le(condition.lte));
        } else {
            throw new InvalidQueryCondition(condition);
        }
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        this.tree = this.tree.remove(key).insert(key, value);
    }
}

// this implementation handles one operation at a time because of the single store level lock
// performance is suboptimal, so this store is intended for testing purposes only
export class InMemoryKeyValueStore implements KVStore<Uint8Array, Uint8Array> {
    private tree: Tree<Uint8Array, Uint8Array> = createTree(compareUint8Array);
    private locker: Locker<InMemoryKeyValueStore> = new InMemoryLocker();

    constructor() {}

    async transaction<TResult>(fn: (txn: Transaction<Uint8Array, Uint8Array>) => Promise<TResult>): Promise<TResult> {
        return await this.locker.lock(this, async () => {
            const retries = 10;

            for (let attempt = 0; attempt <= retries; attempt += 1) {
                const txn = new InMemoryTransaction(this.tree);
                try {
                    const result = await fn(txn);

                    this.tree = txn.tree;

                    return result;
                } catch (error) {
                    if (attempt === retries) {
                        throw error;
                    }
                }
            }

            throw new Error('unreachable');
        });
    }

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        return await this.transaction(txn => txn.get(key));
    }

    async query(condition: Condition<Uint8Array>): Promise<Cursor<Uint8Array, Uint8Array>> {
        return await this.transaction(txn => txn.query(condition));
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        return await this.transaction(txn => txn.put(key, value));
    }
}
