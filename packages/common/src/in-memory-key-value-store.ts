import createTree, {Iterator, Tree} from 'functional-red-black-tree';
import {Condition, Cursor, CursorNext, KeyValueStore, Transaction} from './contracts/key-value-store';
import {Result} from './result';

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

export class InMemoryKeyValueCursor implements Cursor<Uint8Array, Uint8Array> {
    private closed = false;

    constructor(private iterator: Iterator<Uint8Array, Uint8Array>) {}

    async next(): Promise<Result<unknown, CursorNext<Uint8Array<ArrayBufferLike>, Uint8Array<ArrayBufferLike>>>> {
        if (this.closed) {
            return Result.error({type: 'closed', message: 'cursor is closed'});
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

        return Result.ok(result);
    }

    close(): Promise<Result<unknown, void>> {
        this.closed = true;

        return Promise.resolve(Result.ok());
    }
}

export class InMemoryKeyValueStore implements KeyValueStore<Uint8Array, Uint8Array> {
    private tree: Tree<Uint8Array, Uint8Array> = createTree(compareUint8Array);

    constructor() {}

    transaction<TResult>(
        fn: (txn: Transaction<Uint8Array, Uint8Array>) => Promise<Result<unknown, TResult>>
    ): Promise<Result<unknown, TResult>> {
        throw new Error('Method not implemented.');
    }

    async get(key: Uint8Array): Promise<Result<unknown, Uint8Array>> {
        const result = this.tree.get(key);

        if (!result) {
            return Result.error({type: 'not_found', message: 'entry does not exist'});
        } else {
            return Result.ok(result);
        }
    }

    query(condition: Condition<Uint8Array>): Promise<Result<unknown, Cursor<Uint8Array, Uint8Array>>> {
        let cursor: Cursor<Uint8Array, Uint8Array>;

        if (condition.gt) {
            cursor = new InMemoryKeyValueCursor(this.tree.gt(condition.gt));
        } else if (condition.gte) {
            cursor = new InMemoryKeyValueCursor(this.tree.ge(condition.gte));
        } else if (condition.lt) {
            cursor = new InMemoryKeyValueCursor(this.tree.lt(condition.lt));
        } else if (condition.lte) {
            cursor = new InMemoryKeyValueCursor(this.tree.le(condition.lte));
        } else {
            throw new Error('unreachable');
        }

        return Promise.resolve(Result.ok(cursor));
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<Result<unknown, void>> {
        return await this.transaction(async txn => {
            await txn.put(key, value);

            return Result.ok();
        });
    }
}
