import {Channel} from 'async-channel';
import {merge, of} from 'ix/Ix.asynciterable';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {CancelledError, Cx} from './context.js';
import {assert, Nothing} from './utils.js';

export interface ColdStreamExecutor<T> {
    next: (cx: Cx, value: T) => Promise<void>;
    throw: (error: any) => Promise<void>;
    end: () => void;
}

export class StreamPuppet<T> implements AsyncIterable<[Cx, T]> {
    private chan = new Channel<[Cx, T]>();

    async next(cx: Cx, value: T) {
        if (this.chan.closed) {
            return;
        }
        await this.chan.push([cx, value]);
    }

    async throw(error: any) {
        if (this.chan.closed) {
            return;
        }
        await this.chan.throw(error);
    }

    end() {
        if (this.chan.closed) {
            return;
        }
        this.chan.close();
    }

    async *[Symbol.asyncIterator](): AsyncIterator<[Cx, T]> {
        for await (const item of this.chan) {
            yield item;
        }
    }
}

export class ColdStream<T> implements AsyncIterable<[Cx, T]> {
    constructor(
        private readonly execute: (
            executor: ColdStreamExecutor<T>
        ) => () => Nothing
    ) {}

    async *[Symbol.asyncIterator](): AsyncIterator<[Cx, T], any, any> {
        const stream = new StreamPuppet<T>();

        let cancel: (() => Nothing) | undefined = undefined;
        try {
            cancel = this.execute({
                next: async (cx, value) => stream.next(cx, value),
                throw: error => stream.throw(error),
                end: () => stream.end(),
            });
            yield* stream;
        } finally {
            cancel?.();
        }
    }
}

export function astream<T>(
    source: AsyncIterable<[Cx, T]> | [Cx, T][] | Promise<[Cx, T]>
): AsyncStream<T> {
    if (source instanceof Promise) {
        const stream = new ColdStream<T>(exe => {
            source
                .then(([cx, value]) => exe.next(cx, value))
                .catch(error => exe.throw(error))
                .finally(() => exe.end());

            return () => {
                exe.throw(new CancelledError(Cx.todo())).finally(() =>
                    exe.end()
                );
            };
        });
        return astream(stream);
    } else if (Array.isArray(source)) {
        return astream(of(...source));
    }

    return new AsyncStream(source);
}

export function mergeStreams<T>(
    sources: AsyncIterable<[Cx, T]>[]
): AsyncStream<T> {
    const init: AsyncIterable<[Cx, T]> = astream<T>([]);
    return astream<T>(merge(init, ...sources));
}

export class AsyncStream<T> implements AsyncIterable<[Cx, T]> {
    constructor(private readonly source: AsyncIterable<[Cx, T]>) {}

    drop(count: number) {
        return astream(this._drop(count));
    }

    private async *_drop(count: number) {
        for await (const item of this.source) {
            if (count <= 0) {
                yield item;
            }
            count -= 1;
        }
    }

    take(count: number) {
        return astream(this._take(count));
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

    assert<S extends T>(
        validator: (cx: Cx, value: T) => value is S
    ): AsyncStream<S> {
        return astream(this._assert(validator)) as AsyncStream<S>;
    }

    private async *_assert(
        validator: (cx: Cx, value: T) => boolean
    ): AsyncIterable<[Cx, T]> {
        for await (const [cx, item] of this.source) {
            assert(cx, validator(cx, item));

            yield [cx, item];
        }
    }

    concat(...streams: AsyncIterable<[Cx, T]>[]): AsyncStream<T> {
        return astream(this._concat(...streams));
    }

    private async *_concat(...streams: AsyncIterable<[Cx, T]>[]) {
        yield* this.source;

        for (const stream of streams) {
            yield* stream;
        }
    }

    async first(): Promise<T | undefined> {
        return this.find(() => true);
    }

    async find(
        predicate: (cx: Cx, value: T) => Promise<boolean> | boolean
    ): Promise<T | undefined> {
        for await (const [cx, item] of this.source) {
            if (await predicate(cx, item)) {
                return item;
            }
        }

        return undefined;
    }

    flatCatch<R>(
        flatMap: (
            error: unknown
        ) => [Cx, R][] | Promise<[Cx, R]> | AsyncIterable<[Cx, R]>
    ): AsyncStream<T | R> {
        return astream(this._flatCatch(flatMap));
    }

    private async *_flatCatch<R>(
        flatMap: (
            error: unknown
        ) => [Cx, R][] | Promise<[Cx, R]> | AsyncIterable<[Cx, R]>
    ): AsyncIterable<[Cx, T | R]> {
        try {
            yield* this.source;
        } catch (error) {
            yield* astream(flatMap(error));
        }
    }

    catch<R>(
        map: (error: unknown) => Promise<[Cx, R]> | [Cx, R]
    ): AsyncStream<T | R> {
        return astream(this._catch(map));
    }

    async *_catch<R>(
        map: (error: unknown) => Promise<[Cx, R]> | [Cx, R]
    ): AsyncIterable<[Cx, T | R]> {
        try {
            yield* this.source;
        } catch (error) {
            yield await map(error);
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

    async some(
        predicate?: (cx: Cx, value: T) => Promise<boolean> | boolean
    ): Promise<boolean> {
        for await (const [cx, item] of this.source) {
            if (!predicate || (await predicate(cx, item))) {
                return true;
            }
        }

        return false;
    }

    while<S extends T>(
        predicate: (cx: Cx, value: T) => value is S
    ): AsyncStream<S>;
    while(
        predicate: (cx: Cx, value: T) => Promise<boolean> | boolean
    ): AsyncStream<T>;
    while(
        predicate:
            | ((cx: Cx, value: T) => Promise<boolean> | boolean)
            | ((cx: Cx, value: T) => value is T)
    ): AsyncStream<T> {
        return astream(this._while(predicate)) as AsyncStream<any>;
    }

    private async *_while(
        predicate: (cx: Cx, value: T) => Promise<boolean> | boolean
    ): AsyncIterable<[Cx, T]> {
        for await (const [cx, item] of this.source) {
            if (!(await predicate(cx, item))) break;
            yield [cx, item];
        }
    }

    filter<S extends T>(
        predicate: (cx: Cx, value: T) => value is S
    ): AsyncStream<S>;
    filter(
        predicate: (cx: Cx, value: T) => Promise<boolean> | boolean
    ): AsyncStream<T>;
    filter(
        predicate:
            | ((cx: Cx, value: T) => Promise<boolean> | boolean)
            | ((cx: Cx, value: T) => value is T)
    ): AsyncStream<T> {
        return astream(this._filter(predicate)) as AsyncStream<any>;
    }

    private async *_filter(
        predicate: (cx: Cx, value: T) => Promise<boolean> | boolean
    ): AsyncIterable<[Cx, T]> {
        for await (const [cx, item] of this.source) {
            if (await predicate(cx, item)) {
                yield [cx, item];
            }
        }
    }

    flatMap<TResult>(
        flatMapper: (
            cx: Cx,
            value: T
        ) =>
            | [Cx, TResult][]
            | Promise<[Cx, TResult][]>
            | AsyncIterable<[Cx, TResult]>
    ): AsyncStream<TResult> {
        return astream(this._flatMap(flatMapper));
    }

    private async *_flatMap<TResult>(
        flatMapper: (
            cx: Cx,
            value: T
        ) =>
            | [Cx, TResult][]
            | Promise<[Cx, TResult][]>
            | AsyncIterable<[Cx, TResult]>
    ): AsyncIterable<[Cx, TResult]> {
        for await (const [cx, item] of this.source) {
            yield* await flatMapper(cx, item);
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
    ): AsyncIterable<[Cx, TResult]> {
        for await (const [cx, item] of this.source) {
            yield [cx, await mapper(cx, item)];
        }
    }

    mapParallel<TResult>(
        map: (cx: Cx, value: T) => Promise<TResult>
    ): AsyncStream<TResult> {
        return astream(this._mapParallel(map));
    }

    private async *_mapParallel<TResult>(
        mapper: (cx: Cx, value: T) => Promise<TResult>
    ): AsyncIterable<[Cx, TResult]> {
        let left = 0;
        let right = 0;
        const pending = new Map<number, [Cx, Promise<TResult> | TResult]>();

        for await (const [itemCx, item] of this.source) {
            if (pending.size >= MAX_LOOKAHEAD_COUNT) {
                const pendingTuple = pending.get(left);
                assert(itemCx, pendingTuple !== undefined);

                const [pendingCx, pendingPromise] = pendingTuple;
                yield [pendingCx, await pendingPromise];

                pending.delete(left);
                left += 1;
            }

            pending.set(right, [itemCx, mapper(itemCx, item)]);
            right += 1;
        }

        for (; left < right; left += 1) {
            const pendingTuple = pending.get(left);
            assert(Cx.todo(), pendingTuple !== undefined);

            const [pendingCx, pendingPromise] = pendingTuple;
            yield [pendingCx, await pendingPromise];

            pending.delete(left);
        }
    }

    async toArray(): Promise<T[]> {
        const result: T[] = [];
        for await (const [, item] of this.source) {
            result.push(item);
        }

        return result;
    }

    [Symbol.asyncIterator](): AsyncIterator<[Cx, T]> {
        return this.source[Symbol.asyncIterator]();
    }
}
