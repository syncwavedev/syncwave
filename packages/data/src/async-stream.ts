import {Channel} from 'async-channel';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {CancelledError, Context} from './context.js';
import {assert, assertNever, whenAny} from './utils.js';

export interface ColdStreamExecutor<T> {
    next: (ctx: Context, value: T) => Promise<void>;
    end: (ctx: Context) => Promise<void>;
    throw: (ctx: Context, error: any) => Promise<void>;
}

export class HotStream<T> implements AsyncIterable<T> {
    private chan = new Channel<T>();

    async end(_ctx: Context) {
        if (this.chan.closed) {
            console.warn('[WRN] end on a closed HotStream');
            return;
        }
        this.chan.close();
    }

    async next(ctx: Context, value: T) {
        if (this.chan.closed) {
            console.warn('[WRN] next on a closed HotStream');
            return;
        }
        await ctx.race(this.chan.push(value));
    }

    async throw(ctx: Context, error: any) {
        if (this.chan.closed) {
            console.warn('[WRN] throw on a closed HotStream');
            return;
        }
        await ctx.race(this.chan.throw(error));
    }

    async *[Symbol.asyncIterator](): AsyncIterator<T> {
        for await (const item of this.chan) {
            yield item;
        }
    }
}

export class ColdStream<T> implements AsyncIterable<T> {
    constructor(
        private readonly ctx: Context,
        private readonly execute: (
            ctx: Context,
            executor: ColdStreamExecutor<T>
        ) => void
    ) {}

    async *[Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        let complete = false;
        const stream = new HotStream<T>();
        const [ctx, cancel] = this.ctx.withCancel();
        try {
            this.execute(ctx, {
                next: (ctx, value) => stream.next(ctx, value),
                end: ctx => stream.end(ctx),
                throw: (ctx, error) => stream.throw(ctx, error),
            });
            yield* stream;

            complete = true;
        } catch (error) {
            if (!(error instanceof CancelledError)) {
                throw error;
            }
        } finally {
            if (!complete) {
                await cancel();
                await stream.end(ctx);
            }
        }
    }
}

export function astream<T>(source: AsyncIterable<T> | T[]): AsyncStream<T> {
    if (Array.isArray(source)) {
        return new AsyncStream(
            new ColdStream(Context.todo(), async (ctx, {next, end}) => {
                for (const item of source) {
                    ctx.ensureAlive('cold stream');
                    await next(ctx, item);
                }
                await end(ctx);
            })
        );
    }

    return new AsyncStream(source);
}

export function mergeStreams<T>(source: AsyncIterable<T>[]): AsyncStream<T> {
    return astream(
        new ColdStream(Context.todo(), async (ctx, exe) => {
            try {
                let promises = source
                    .map(x => x[Symbol.asyncIterator]())
                    .map(iter =>
                        iter.next().then(result => ({
                            result,
                            iter,
                        }))
                    );
                while (promises.length > 0 && ctx.alive) {
                    try {
                        const [racer, rest] = await ctx.race(whenAny(promises));
                        promises = rest;
                        if (racer.result.done) {
                            // do nothing
                        } else {
                            const promise = racer.iter.next().then(result => ({
                                type: 'next' as const,
                                result,
                                iter: racer.iter,
                            }));
                            promises.push(promise);
                            await exe.next(ctx, racer.result.value);
                        }
                    } catch (error) {
                        await exe.throw(ctx, error);
                    }
                }
            } catch (error) {
                if (!(error instanceof CancelledError)) {
                    throw error;
                }
            } finally {
                await exe.end(ctx);
            }
        })
    );
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

    finally(fn: () => Promise<void>): AsyncStream<T> {
        return astream(this._finally(fn));
    }

    async *_finally(fn: () => Promise<void>) {
        try {
            yield* this.source;
        } finally {
            await fn();
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

    until(signal: Promise<void>) {
        return astream({
            [Symbol.asyncIterator]: () => {
                const iterator = this.source[Symbol.asyncIterator]();
                return {
                    next: async (value: any) => {
                        const result = await Promise.race([
                            iterator.next(value).then(value => ({
                                type: 'next' as const,
                                value,
                            })),
                            signal.then(() => ({
                                type: 'cancellation' as const,
                            })),
                        ]);

                        if (result.type === 'next') {
                            return result.value;
                        } else if (result.type === 'cancellation') {
                            await iterator.return?.();
                            return {done: true, value: undefined};
                        } else {
                            assertNever(result);
                        }
                    },
                    return: iterator.return
                        ? async (value: any) => {
                              return await iterator.return!(value);
                          }
                        : undefined,
                    throw: iterator.throw
                        ? async (error: any) => {
                              return await iterator.throw!(error);
                          }
                        : undefined,
                };
            },
        });
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
            value: T
        ) => TResult[] | Promise<TResult[]> | AsyncIterable<TResult>
    ): AsyncStream<TResult> {
        return astream(this._flatMap(flatMapper));
    }

    private async *_flatMap<TResult>(
        flatMapper: (
            value: T
        ) => TResult[] | Promise<TResult[]> | AsyncIterable<TResult>
    ): AsyncIterable<TResult> {
        for await (const item of this.source) {
            yield* await flatMapper(item);
        }
    }

    map<TResult>(
        mapper: (value: T) => TResult | Promise<TResult>
    ): AsyncStream<TResult> {
        return astream(this._map(mapper));
    }

    private async *_map<TResult>(
        mapper: (value: T) => TResult | Promise<TResult>
    ): AsyncIterable<TResult> {
        for await (const item of this.source) {
            yield await mapper(item);
        }
    }

    mapParallel<TResult>(
        mapper: (ctx: Context, value: T) => TResult | Promise<TResult>
    ): AsyncStream<TResult> {
        return astream(
            new ColdStream(Context.todo(), async (ctx, {next, end}) => {
                let left = 0;
                let right = 0;
                const pending = new Map<number, Promise<TResult> | TResult>();

                for await (const item of astream(this.source).until(
                    ctx.cancelPromise
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

                await end(ctx);
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
