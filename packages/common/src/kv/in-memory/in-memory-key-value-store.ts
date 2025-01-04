import createTree, {Iterator, Tree} from 'functional-red-black-tree';
import {compareUint8Array} from '../../utils';
import {Condition, Entry, InvalidQueryCondition, KVStore, Transaction} from '../kv-store';
import {InMemoryLocker} from './in-memory-locker';
import {Locker} from './locker';

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
        if (condition.gt) {
            iterator = this.tree.gt(condition.gt);
        } else if (condition.gte) {
            iterator = this.tree.ge(condition.gte);
        } else if (condition.lt) {
            iterator = this.tree.lt(condition.lt);
        } else if (condition.lte) {
            iterator = this.tree.le(condition.lte);
        } else {
            throw new InvalidQueryCondition(condition);
        }

        while (iterator.valid) {
            console.log('work', iterator.key);
            yield {
                key: iterator.key!,
                value: iterator.value!,
            };

            console.log('next');
            iterator.next();
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
}
