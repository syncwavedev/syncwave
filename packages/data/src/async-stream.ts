import {Channel} from 'async-channel';
import {merge, of} from 'ix/Ix.asynciterable';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {CancelledError, Cx} from './context.js';
import {AppError} from './errors.js';
import {logger} from './logger.js';
import {assert, Nothing} from './utils.js';

export interface ColdStreamExecutor<T> {
    next: (cx: Cx, value: T) => Promise<void>;
    throw: (cx: Cx, error: any) => Promise<void>;
    end: (cx: Cx) => void;
}

export class StreamPuppet<T> implements AsyncIterable<T> {
    private chan = new Channel<T>();

    constructor(cx: Cx) {
        cx.onCancel(cx, cx => {
            this.throw(cx, new CancelledError(cx))
                .then(() => this.end())
                .catch(error => {
                    logger.error(cx, 'HotStream onCancel', error);
                });
        });
    }

    async next(cx: Cx, value: T) {
        if (this.chan.closed) {
            return;
        }
        await this.chan.push(value);
    }

    async throw(cx: Cx, error: any) {
        if (this.chan.closed) {
            return;
        }
        await this.chan.throw(
            new AppError(cx, 'HotStream.throw', {cause: error})
        );
    }

    end() {
        if (this.chan.closed) {
            return;
        }
        this.chan.close();
    }

    async *[Symbol.asyncIterator](): AsyncIterator<T> {
        for await (const item of this.chan) {
            yield item;
        }
    }
}

export class ColdStream<T> implements AsyncIterable<T> {
    constructor(
        private readonly parentCx: Cx,
        private readonly execute: (
            cx: Cx,
            executor: ColdStreamExecutor<T>
        ) => Nothing
    ) {}

    async *[Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        const [cx, cancelCx] = this.parentCx.withCancel();
        cx.onCancel(cx, cx => {
            stream
                .throw(cx, new CancelledError(cx))
                .then(() => stream.end())
                .catch(error => logger.error(cx, 'ColdStream onCancel', error));
        });

        const stream = new StreamPuppet<T>(cx);

        try {
            this.execute(cx, {
                next: async (cx, value) => stream.next(cx, value),
                throw: (cx, error) => stream.throw(cx, error),
                end: () => stream.end(),
            });
            yield* stream;
        } finally {
            cancelCx(cx);
        }
    }
}

export function astream<T>(
    source: AsyncIterable<T> | T[] | Promise<T>
): AsyncStream<T> {
    if (source instanceof Promise) {
        const stream = new ColdStream<T>(Cx.todo(), (cx, exe) => {
            source
                .then(value => exe.next(cx, value))
                .catch(error => exe.throw(cx, error))
                .finally(() => exe.end(cx));
        });
        return astream(stream);
    } else if (Array.isArray(source)) {
        return astream(of(...source));
    }

    return new AsyncStream(source);
}

export function mergeStreams<T>(sources: AsyncIterable<T>[]): AsyncStream<T> {
    return astream(merge(astream([]), ...sources));
}

export class AsyncStream<T> implements AsyncIterable<T> {
    constructor(private readonly source: AsyncIterable<T>) {}

    drop(count: number) {
        return astream(this._drop(count));
    }

    take(count: number) {
        return astream(this._take(count));
    }

    assert<S extends T>(
        validator: (cx: Cx, value: T) => value is S
    ): AsyncStream<S> {
        return astream(this._assert(validator)) as AsyncStream<S>;
    }

    private async *_assert(validator: (cx: Cx, value: T) => boolean) {
        const [cx, cancel] = Cx.create();
        try {
            for await (const item of this.source) {
                assert(cx, validator(cx, item));

                yield item;
            }
        } finally {
            cancel(cx);
        }
    }

    concat(...streams: AsyncIterable<T>[]): AsyncStream<T> {
        return astream(this._concat(...streams));
    }

    private async *_concat(...streams: AsyncIterable<T>[]): AsyncIterable<T> {
        yield* this.source;

        for (const stream of streams) {
            yield* stream;
        }
    }

    async first(): Promise<T | undefined> {
        return this.find(() => true);
    }

    async find(predicate: (value: T) => boolean): Promise<T | undefined> {
        for await (const item of this.source) {
            if (predicate(item)) {
                return item;
            }
        }

        return undefined;
    }

    flatCatch<R>(
        flatMap: (cx: Cx, error: unknown) => R[] | Promise<R> | AsyncIterable<R>
    ): AsyncStream<T | R> {
        return astream(this._flatCatch(flatMap));
    }

    private async *_flatCatch<R>(
        flatMap: (cx: Cx, error: unknown) => R[] | Promise<R> | AsyncIterable<R>
    ): AsyncIterable<T | R> {
        const [cx, cancel] = Cx.create();
        try {
            yield* this.source;
        } catch (error) {
            yield* astream(flatMap(cx, error));
        } finally {
            cancel(cx);
        }
    }

    catch<R>(
        map: (cx: Cx, error: unknown) => Promise<R> | R
    ): AsyncStream<T | R> {
        return astream(this._catch(map));
    }

    async *_catch<R>(
        map: (cx: Cx, error: unknown) => Promise<R> | R
    ): AsyncIterable<T | R> {
        const [cx, cancel] = Cx.create();
        try {
            yield* this.source;
        } catch (error) {
            yield await map(cx, error);
        } finally {
            cancel(cx);
        }
    }

    finally(fn: () => undefined | void): AsyncStream<T> {
        return astream(this._finally(fn));
    }

    async *_finally(fn: () => Nothing) {
        try {
            yield* this.source;
        } finally {
            fn();
        }
    }

    async some(predicate?: (value: T) => boolean): Promise<boolean> {
        for await (const item of this.source) {
            if (!predicate || predicate(item)) {
                return true;
            }
        }

        return false;
    }

    withContext(cx: Cx) {
        return astream<T>(
            new ColdStream(cx, (cx, exe) => {
                (async () => {
                    try {
                        for await (const value of this.source) {
                            await exe.next(cx, value);
                        }
                    } catch (error) {
                        await exe.throw(cx, error);
                    } finally {
                        exe.end(cx);
                    }
                })().catch(error => {
                    logger.error(cx, 'AsyncStream.withContext', error);
                });
            })
        );
    }

    while<S extends T>(predicate: (value: T) => value is S): AsyncStream<S>;
    while(predicate: (value: T) => boolean): AsyncStream<T>;
    while(
        predicate: ((value: T) => boolean) | ((value: T) => value is T)
    ): AsyncStream<T> {
        return astream(this._while(predicate)) as AsyncStream<any>;
    }

    filter<S extends T>(predicate: (value: T) => value is S): AsyncStream<S>;
    filter(predicate: (value: T) => boolean): AsyncStream<T>;
    filter(
        predicate: ((value: T) => boolean) | ((value: T) => value is T)
    ): AsyncStream<T> {
        return astream(this._filter(predicate)) as AsyncStream<any>;
    }

    flatMap<TResult>(
        flatMapper: (
            cx: Cx,
            value: T
        ) => TResult[] | Promise<TResult[]> | AsyncIterable<TResult>
    ): AsyncStream<TResult> {
        return astream(this._flatMap(flatMapper));
    }

    private async *_flatMap<TResult>(
        flatMapper: (
            cx: Cx,
            value: T
        ) => TResult[] | Promise<TResult[]> | AsyncIterable<TResult>
    ): AsyncIterable<TResult> {
        for await (const item of this.source) {
            yield* await flatMapper(Cx.todo(), item);
        }
    }

    tap(cb: (cx: Cx, value: T) => Promise<void> | void): AsyncStream<T> {
        return this.map(async (cx, value) => {
            await cb(cx, value);
            return value;
        });
    }

    map<TResult>(
        mapper: (cx: Cx, value: T) => TResult | Promise<TResult>
    ): AsyncStream<TResult> {
        return astream(this._map(mapper));
    }

    private async *_map<TResult>(
        mapper: (context: Cx, value: T) => TResult | Promise<TResult>
    ): AsyncIterable<TResult> {
        for await (const item of this.source) {
            yield await mapper(Cx.todo(), item);
        }
    }

    mapParallel<TResult>(
        mapper: (cx: Cx, value: T) => Promise<TResult>
    ): AsyncStream<TResult> {
        return astream(
            new ColdStream(Cx.todo(), (cx, {next, end}) => {
                (async () => {
                    let left = 0;
                    let right = 0;
                    const pending = new Map<
                        number,
                        Promise<TResult> | TResult
                    >();

                    for await (const item of astream(this.source).withContext(
                        cx
                    )) {
                        if (pending.size >= MAX_LOOKAHEAD_COUNT) {
                            assert(cx, pending.has(left));
                            await next(cx, await pending.get(left)!);
                            pending.delete(left);
                            left += 1;
                        }

                        pending.set(right, mapper(cx, item));
                        right += 1;
                    }

                    for (; left < right; left += 1) {
                        assert(cx, pending.has(left));
                        await next(cx, await pending.get(left)!);
                        pending.delete(left);
                    }

                    end(cx);
                })().catch(error => {
                    logger.error(cx, 'error in mapParallel', error);
                });
            })
        );
    }

    async toArray(cx: Cx): Promise<T[]> {
        const result: T[] = [];
        for await (const item of astream(this.source).withContext(cx)) {
            result.push(item);
        }

        return result;
    }

    [Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        return this.source[Symbol.asyncIterator]();
    }

    private async *_while(predicate: (value: T) => boolean) {
        for await (const item of this.source) {
            if (!predicate(item)) break;
            yield item;
        }
    }

    private async *_filter(predicate: (value: T) => boolean) {
        for await (const item of this.source) {
            if (predicate(item)) {
                yield item;
            }
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
