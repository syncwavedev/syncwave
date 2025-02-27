import createTree, {type Tree} from 'functional-red-black-tree';
import {context} from '../context.js';
import {AppError} from '../errors.js';
import {toStream, type Stream} from '../stream.js';
import {compareUint8Array} from '../utils.js';
import type {Condition, Entry, Uint8Entry} from './kv-store.js';
import {InvalidQueryCondition} from './kv-store.js';

export interface AtomicStore {
    // undefined means deletion
    write(
        batch: ReadonlyArray<Entry<Uint8Array, Uint8Array | undefined>>
    ): Promise<void>;
    read(condition: Condition<Uint8Array>): Stream<Uint8Entry>;
    close(reason: unknown): void;
}

export class MemAtomicStore implements AtomicStore {
    private tree: Tree<Uint8Array, Uint8Array> = createTree(compareUint8Array);
    private closed = false;

    constructor() {}

    async write(
        batch: ReadonlyArray<Entry<Uint8Array, Uint8Array | undefined>>
    ): Promise<void> {
        this.ensureOpen();

        for (const {key, value} of batch) {
            if (value === undefined) {
                // Delete operation
                this.tree = this.tree.remove(key);
            } else {
                // Insert or update operation
                this.tree = this.tree.remove(key).insert(key, value);
            }
        }
    }

    read(condition: Condition<Uint8Array>): Stream<Uint8Entry> {
        return toStream(this._readIterable(condition));
    }

    private async *_readIterable(
        condition: Condition<Uint8Array>
    ): AsyncIterable<Uint8Entry> {
        this.ensureOpen();

        let iter;
        if (condition.gt) {
            iter = this.tree.gt(condition.gt);
        } else if (condition.gte) {
            iter = this.tree.ge(condition.gte);
        } else if (condition.lt) {
            iter = this.tree.lt(condition.lt);
        } else if (condition.lte) {
            iter = this.tree.le(condition.lte);
        } else {
            throw new InvalidQueryCondition(condition);
        }

        const isForward =
            condition.gt !== undefined || condition.gte !== undefined;

        while (iter.valid) {
            context().ensureActive();
            yield {key: iter.key!, value: iter.value!};
            if (isForward) {
                iter.next();
            } else {
                iter.prev();
            }
        }
    }

    close(reason?: unknown): void {
        this.closed = true;
        // No resources to clean up
    }

    private ensureOpen() {
        if (this.closed) {
            throw new AppError('MemAtomicStore is closed');
        }
    }
}
