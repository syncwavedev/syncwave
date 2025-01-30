import {Channel} from 'async-channel';
import {merge, of} from 'ix/Ix.asynciterable';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {CancelledError, Context} from './context.js';
import {assert, Nothing} from './utils.js';

export interface ColdStreamExecutor<T> {
    next: (ctx: Context, value: T) => Promise<void>;
    throw: (ctx: Context, error: any) => Promise<void>;
    end: (ctx: Context) => void;
}

export class StreamPuppet<T> implements AsyncIterable<T> {
    private chan = new Channel<T>();

    constructor(ctx: Context) {
        ctx.onCancel(() => {
            this.throw(new CancelledError())
                .then(() => this.end())
                .catch(error => {
                    console.error('[ERR] HotStream onCancel', error);
                });
        });
    }

    async next(value: T) {
        if (this.chan.closed) {
            return;
        }
        await this.chan.push(value);
    }

    async throw(error: any) {
        if (this.chan.closed) {
            return;
        }
        await this.chan.throw(new Error('HotStream.throw', {cause: error}));
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
        private readonly parentCtx: Context,
        private readonly execute: (
            ctx: Context,
            executor: ColdStreamExecutor<T>
        ) => Nothing
    ) {}

    async *[Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        const [ctx, cancelCtx] = this.parentCtx.withCancel();
        ctx.onCancel(() => {
            stream
                .throw(new CancelledError())
                .then(() => stream.end())
                .catch(error =>
                    console.error('[ERR] ColdStream onCancel', error)
                );
        });

        const stream = new StreamPuppet<T>(ctx);

        try {
            this.execute(ctx, {
                next: async (ctx, value) => stream.next(value),
                throw: (ctx, error) => stream.throw(error),
                end: () => stream.end(),
            });
            yield* stream;
        } finally {
            cancelCtx();
        }
    }
}

export function astream<T>(
    source: AsyncIterable<T> | T[] | Promise<T>
): AsyncStream<T> {
    if (source instanceof Promise) {
        const stream = new ColdStream<T>(Context.todo(), (ctx, exe) => {
            source
                .then(value => exe.next(ctx, value))
                .catch(error => exe.throw(ctx, error))
                .finally(() => exe.end(ctx));
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

    assert<S extends T>(validator: (value: T) => value is S): AsyncStream<S> {
        return astream(this._assert(validator)) as AsyncStream<S>;
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

    private async *_assert(validator: (value: T) => boolean) {
        for await (const item of this.source) {
            assert(validator(item));

            yield item;
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
        flatMap: (
            ctx: Context,
            error: unknown
        ) => R[] | Promise<R> | AsyncIterable<R>
    ): AsyncStream<T | R> {
        return astream(this._flatCatch(flatMap));
    }

    private async *_flatCatch<R>(
        flatMap: (
            ctx: Context,
            error: unknown
        ) => R[] | Promise<R> | AsyncIterable<R>
    ): AsyncIterable<T | R> {
        const [ctx, cancel] = Context.create();
        try {
            yield* this.source;
        } catch (error) {
            yield* astream(flatMap(ctx, error));
        } finally {
            cancel();
        }
    }

    catch<R>(
        map: (ctx: Context, error: unknown) => Promise<R> | R
    ): AsyncStream<T | R> {
        return astream(this._catch(map));
    }

    async *_catch<R>(
        map: (ctx: Context, error: unknown) => Promise<R> | R
    ): AsyncIterable<T | R> {
        const [ctx, cancel] = Context.create();
        try {
            yield* this.source;
        } catch (error) {
            yield await map(ctx, error);
        } finally {
            cancel();
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

    withContext(ctx: Context) {
        return astream<T>(
            new ColdStream(ctx, (ctx, exe) => {
                (async () => {
                    try {
                        for await (const value of this.source) {
                            await exe.next(ctx, value);
                        }
                    } catch (error) {
                        await exe.throw(ctx, error);
                    } finally {
                        exe.end(ctx);
                    }
                })().catch(error => {
                    console.error('[ERR] AsyncStream.withContext', error);
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
            ctx: Context,
            value: T
        ) => TResult[] | Promise<TResult[]> | AsyncIterable<TResult>
    ): AsyncStream<TResult> {
        return astream(this._flatMap(flatMapper));
    }

    private async *_flatMap<TResult>(
        flatMapper: (
            ctx: Context,
            value: T
        ) => TResult[] | Promise<TResult[]> | AsyncIterable<TResult>
    ): AsyncIterable<TResult> {
        for await (const item of this.source) {
            yield* await flatMapper(Context.todo(), item);
        }
    }

    tap(cb: (ctx: Context, value: T) => Promise<void> | void): AsyncStream<T> {
        return this.map(async (ctx, value) => {
            await cb(ctx, value);
            return value;
        });
    }

    map<TResult>(
        mapper: (ctx: Context, value: T) => TResult | Promise<TResult>
    ): AsyncStream<TResult> {
        return astream(this._map(mapper));
    }

    private async *_map<TResult>(
        mapper: (context: Context, value: T) => TResult | Promise<TResult>
    ): AsyncIterable<TResult> {
        for await (const item of this.source) {
            yield await mapper(Context.todo(), item);
        }
    }

    mapParallel<TResult>(
        mapper: (ctx: Context, value: T) => Promise<TResult>
    ): AsyncStream<TResult> {
        return astream(
            new ColdStream(Context.todo(), (ctx, {next, end}) => {
                (async () => {
                    let left = 0;
                    let right = 0;
                    const pending = new Map<
                        number,
                        Promise<TResult> | TResult
                    >();

                    for await (const item of astream(this.source).withContext(
                        ctx
                    )) {
                        if (pending.size >= MAX_LOOKAHEAD_COUNT) {
                            assert(pending.has(left));
                            await next(ctx, await pending.get(left)!);
                            pending.delete(left);
                            left += 1;
                        }

                        pending.set(right, mapper(ctx, item));
                        right += 1;
                    }

                    for (; left < right; left += 1) {
                        assert(pending.has(left));
                        await next(ctx, await pending.get(left)!);
                        pending.delete(left);
                    }

                    end(ctx);
                })().catch(error => {
                    console.error('[ERR] error in mapParallel', error);
                });
            })
        );
    }

    async toArray(ctx: Context): Promise<T[]> {
        const result: T[] = [];
        for await (const item of astream(this.source).withContext(ctx)) {
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
