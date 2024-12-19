import createTree, {Iterator, Tree} from 'functional-red-black-tree';
import {Condition, Cursor, CursorNext, KeyValueStore, Transaction} from './contracts/key-value-store';

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

        if (this.iterator.hasNext) {
            this.iterator.next();

            result = {
                type: 'entry',
                key: this.iterator.key!,
                value: this.iterator.value!,
            };
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

export class InMemoryKeyValueStore implements KeyValueStore<Uint8Array, Uint8Array> {
    private tree: Tree<Uint8Array, Uint8Array> = createTree(compareUint8Array);

    constructor() {}

    transaction<TResult>(fn: (txn: Transaction<Uint8Array, Uint8Array>) => Promise<TResult>): Promise<TResult> {
        throw new Error('Method not implemented.');
    }

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
            throw new Error('unreachable');
        }
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        return await this.transaction(async txn => {
            await txn.put(key, value);
        });
    }
}
