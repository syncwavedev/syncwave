import {pushable} from 'it-pushable';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {assert} from './utils.js';

export class DeferredStream<T> implements AsyncIterable<T> {
    constructor(
        private readonly executor: (
            next: (value: T) => void,
            end: () => void
        ) => void
    ) {}

    [Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        const result = pushable<T>({objectMode: true});
        this.executor(
            value => result.push(value),
            () => result.end()
        );

        return result;
    }
}

export function astream<T>(source: AsyncIterable<T>): AsyncStream<T> {
    return new AsyncStream(source);
}

export class AsyncStream<T> implements AsyncIterable<T> {
    constructor(private readonly source: AsyncIterable<T>) {}

    drop(count: number) {
        return astream(this._drop(count));
    }

    take(count: number) {
        return astream(this._take(count));
    }

    assert<S extends T>(validator: (value: T) => value is S): AsyncStream<S> {
        return astream(this._assert(validator)) as AsyncStream<S>;
    }

    async find(predicate: (value: T) => boolean): Promise<T | undefined> {
        for await (const item of this.source) {
            if (predicate(item)) {
                return item;
            }
        }

        return undefined;
    }

    async some(predicate?: (value: T) => boolean): Promise<boolean> {
        for await (const item of this.source) {
            if (!predicate || predicate(item)) {
                return true;
            }
        }

        return false;
    }

    filter<S extends T>(predicate: (value: T) => value is S): AsyncStream<S> {
        return astream(this._filter(predicate)) as AsyncStream<S>;
    }

    map<TResult>(
        mapper: (value: T) => TResult | Promise<TResult>
    ): AsyncStream<TResult> {
        return astream(
            new DeferredStream(async (next, end) => {
                let left = 0;
                let right = 0;
                const pending = new Map<number, Promise<TResult> | TResult>();

                for await (const item of this.source) {
                    if (pending.size >= MAX_LOOKAHEAD_COUNT) {
                        assert(pending.has(left));
                        next(await pending.get(left)!);
                        pending.delete(left);
                        left += 1;
                    }

                    pending.set(right, mapper(item));
                    right += 1;
                }

                for (; left < right; left += 1) {
                    assert(pending.has(left));
                    next(await pending.get(left)!);
                    pending.delete(left);
                }

                end();
            })
        );
    }

    async toArray(): Promise<T[]> {
        const result: T[] = [];
        for await (const item of this.source) {
            result.push(item);
        }

        return result;
    }

    [Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        return this.source[Symbol.asyncIterator]();
    }

    private async *_assert(validator: (value: T) => boolean) {
        for await (const item of this.source) {
            assert(validator(item));

            yield item;
        }
    }

    private async *_filter(predicate: (value: T) => boolean) {
        for await (const item of this.source) {
            assert(predicate(item));

            yield item;
        }
    }

    private async *_take(count: number) {
        if (count === 0) {
            return;
        }

        for await (const item of this.source) {
            yield item;

            count -= 1;
            if (count <= 0) {
                return;
            }
        }
    }

    private async *_drop(count: number) {
        for await (const item of this.source) {
            if (count <= 0) {
                yield item;
            }
            count -= 1;
        }
    }
}
