import createTree, {Iterator, Tree} from 'functional-red-black-tree';
import {compareUint8Array} from '../utils';
import {Condition, Entry, InvalidQueryCondition, KVStore, Transaction} from './kv-store';

export class CursorClosedError extends Error {
    constructor() {
        super('cursor is closed');
    }
}

export class InMemoryTransaction implements Transaction<Uint8Array, Uint8Array> {
    constructor(public tree: Tree<Uint8Array, Uint8Array>) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        return this.tree.get(key) ?? undefined;
    }

    async *query(condition: Condition<Uint8Array>): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        let iterator: Iterator<Uint8Array, Uint8Array>;
        let useNext;
        if (condition.gt) {
            iterator = this.tree.gt(condition.gt);
            useNext = true;
        } else if (condition.gte) {
            iterator = this.tree.ge(condition.gte);
            useNext = true;
        } else if (condition.lt) {
            iterator = this.tree.lt(condition.lt);
            useNext = false;
        } else if (condition.lte) {
            iterator = this.tree.le(condition.lte);
            useNext = false;
        } else {
            throw new InvalidQueryCondition(condition);
        }

        while (iterator.valid) {
            yield {
                key: iterator.key!,
                value: iterator.value!,
            };

            if (useNext) {
                iterator.next();
            } else {
                iterator.prev();
            }
        }
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        this.tree = this.tree.remove(key).insert(key, value);
    }

    async delete(key: Uint8Array<ArrayBufferLike>): Promise<void> {
        this.tree = this.tree.remove(key);
    }
}

// this implementation handles one operation at a time because of the single store level lock
// performance is suboptimal, so this store is intended for testing purposes only
export class InMemoryKVStore implements KVStore<Uint8Array, Uint8Array> {
    private tree: Tree<Uint8Array, Uint8Array> = createTree(compareUint8Array);
    private locker = new InMemoryLocker();

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
}

export class InMemoryLocker<TKey> {
    private fnQueueMap: Map<TKey, Array<() => Promise<any>>> = new Map();

    async lock<TResult>(key: TKey, fn: () => Promise<TResult>): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            const execute = async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.dequeue(key);
                }
            };

            const fnQueue = this.fnQueueMap.get(key);

            if (!fnQueue) {
                this.fnQueueMap.set(key, []);
                execute();
            } else {
                fnQueue.push(execute);
            }
        });
    }

    private dequeue(key: TKey): void {
        const fnQueue = this.fnQueueMap.get(key);
        if (!fnQueue) {
            return;
        }

        if (fnQueue.length === 0) {
            this.fnQueueMap.delete(key);
            return;
        }

        const nextFn = fnQueue.shift();
        if (nextFn) {
            nextFn();
        }
    }
}
