import {Channel as AsyncChannel} from 'async-channel';
import {merge, of} from 'ix/Ix.asynciterable';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {Cancel, CancelledError} from './context.js';
import {toError} from './errors.js';
import {logger} from './logger.js';
import {assert, Nothing} from './utils.js';

export interface ChannelWriter<T> {
    next: (value: T) => Promise<void>;
    throw: (error: Error) => Promise<void>;
    end: () => void;
}

export class Channel<T> implements AsyncIterable<T>, ChannelWriter<T> {
    private chan = new AsyncChannel<T>();

    async next(value: T) {
        if (this.chan.closed) {
            logger.debug('Channel closed, next', value);
            return;
        }
        await this.chan.push(value);
    }

    async throw(error: any) {
        if (this.chan.closed) {
            return;
        }
        await this.chan.throw(error);
    }

    end() {
        logger.debug('Channel close');
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

    async pipe(writer: ChannelWriter<T>): Promise<void> {
        try {
            for await (const value of this) {
                await writer.next(value);
            }
        } catch (error: unknown) {
            await writer.throw(toError(error));
        } finally {
            writer.end();
        }
    }
}

class AsyncIteratorFactory<T> implements AsyncIterable<T> {
    constructor(
        private readonly execute: (channel: ChannelWriter<T>) => () => Nothing
    ) {}

    async *[Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        const channel = new Channel<T>();

        let cancel: (() => Nothing) | undefined = undefined;
        try {
            cancel = this.execute(channel);

            yield* channel;
        } finally {
            cancel?.();
        }
    }
}

export function toStream<T>(
    source:
        | AsyncIterable<T>
        | T[]
        | Promise<T>
        | ((writer: ChannelWriter<T>) => Cancel)
): Stream<T> {
    if (source instanceof Promise) {
        const factory = new AsyncIteratorFactory<T>(exe => {
            source
                .then(value => exe.next(value))
                .catch(error => exe.throw(error))
                .finally(() => exe.end());

            return () => {
                exe.throw(new CancelledError())
                    .finally(() => exe.end())
                    .catch(error => {
                        logger.error('stream unsubscribe', error);
                    });
            };
        });
        return toStream(factory);
    } else if (Array.isArray(source)) {
        return toStream(of(...source));
    }

    return new Stream(source);
}

export function mergeStreams<T>(sources: AsyncIterable<T>[]): Stream<T> {
    const init: AsyncIterable<T> = toStream<T>([]);
    return toStream<T>(merge(init, ...sources));
}

export type Observable<TValue, TUpdate> = Promise<[TValue, Stream<TUpdate>]>;

export abstract class AsyncIterableX<T> implements AsyncIterable<T> {
    drop(count: number) {
        return toStream(this._drop(count));
    }

    private async *_drop(count: number) {
        for await (const item of this) {
            if (count <= 0) {
                yield item;
            }
            count -= 1;
        }
    }

    take(count: number) {
        return toStream(this._take(count));
    }

    private async *_take(count: number) {
        if (count === 0) {
            return;
        }

        for await (const item of this) {
            yield item;

            count -= 1;
            if (count <= 0) {
                return;
            }
        }
    }

    assert<S extends T>(validator: (value: T) => value is S): Stream<S> {
        return toStream(this._assert(validator)) as Stream<S>;
    }

    private async *_assert(validator: (value: T) => boolean): AsyncIterable<T> {
        for await (const item of this) {
            assert(validator(item));

            yield item;
        }
    }

    concat(...iterables: AsyncIterable<T>[]): Stream<T> {
        return toStream(this._concat(...iterables));
    }

    private async *_concat(...iterables: AsyncIterable<T>[]) {
        yield* this;

        for (const stream of iterables) {
            yield* stream;
        }
    }

    async first(): Promise<T | undefined> {
        return this.find(() => true);
    }

    async find(
        predicate: (value: T) => Promise<boolean> | boolean
    ): Promise<T | undefined> {
        for await (const item of this) {
            if (await predicate(item)) {
                return item;
            }
        }

        return undefined;
    }

    flatCatch<R>(
        flatMap: (error: unknown) => R[] | Promise<R> | AsyncIterable<R>
    ): Stream<T | R> {
        return toStream(this._flatCatch(flatMap));
    }

    private async *_flatCatch<R>(
        flatMap: (error: unknown) => R[] | Promise<R> | AsyncIterable<R>
    ): AsyncIterable<T | R> {
        try {
            yield* this;
        } catch (error) {
            yield* toStream(flatMap(error));
        }
    }

    catch<R>(map: (error: unknown) => Promise<R> | R): Stream<T | R> {
        return toStream(this._catch(map));
    }

    async *_catch<R>(
        map: (error: unknown) => Promise<R> | R
    ): AsyncIterable<T | R> {
        try {
            yield* this;
        } catch (error) {
            yield await map(error);
        }
    }

    finally(fn: () => undefined | void): Stream<T> {
        return toStream(this._finally(fn));
    }

    private async *_finally(fn: () => Nothing) {
        try {
            yield* this;
        } finally {
            fn();
        }
    }

    async some(
        predicate?: (value: T) => Promise<boolean> | boolean
    ): Promise<boolean> {
        for await (const item of this) {
            if (!predicate || (await predicate(item))) {
                return true;
            }
        }

        return false;
    }

    while<S extends T>(predicate: (value: T) => value is S): Stream<S>;
    while(predicate: (value: T) => Promise<boolean> | boolean): Stream<T>;
    while(
        predicate:
            | ((value: T) => Promise<boolean> | boolean)
            | ((value: T) => value is T)
    ): Stream<T> {
        return toStream(this._while(predicate)) as Stream<any>;
    }

    private async *_while(
        predicate: (value: T) => Promise<boolean> | boolean
    ): AsyncIterable<T> {
        for await (const item of this) {
            if (!(await predicate(item))) break;
            yield item;
        }
    }

    filter<S extends T>(predicate: (value: T) => value is S): Stream<S>;
    filter(predicate: (value: T) => Promise<boolean> | boolean): Stream<T>;
    filter(
        predicate:
            | ((value: T) => Promise<boolean> | boolean)
            | ((value: T) => value is T)
    ): Stream<T> {
        return toStream(this._filter(predicate)) as Stream<any>;
    }

    private async *_filter(
        predicate: (value: T) => Promise<boolean> | boolean
    ): AsyncIterable<T> {
        for await (const item of this) {
            if (await predicate(item)) {
                yield item;
            }
        }
    }

    flatMap<R>(
        flatMapper: (value: T) => R[] | Promise<R[]> | AsyncIterable<R>
    ): Stream<R> {
        return toStream(this._flatMap(flatMapper));
    }

    private async *_flatMap<R>(
        flatMapper: (value: T) => R[] | Promise<R[]> | AsyncIterable<R>
    ): AsyncIterable<R> {
        for await (const item of this) {
            yield* await flatMapper(item);
        }
    }

    tap(cb: (value: T) => Promise<void> | void): Stream<T> {
        return this.map(async value => {
            await cb(value);
            return value;
        });
    }

    map<R>(mapper: (value: T) => R | Promise<R>): Stream<R> {
        return toStream(this._map(mapper));
    }

    private async *_map<R>(
        mapper: (value: T) => R | Promise<R>
    ): AsyncIterable<R> {
        for await (const item of this) {
            yield await mapper(item);
        }
    }

    mapParallel<R>(map: (value: T) => Promise<R>): Stream<R> {
        return toStream(this._mapParallel(map));
    }

    private async *_mapParallel<R>(
        mapper: (value: T) => Promise<R>
    ): AsyncIterable<R> {
        let left = 0;
        let right = 0;
        const pending = new Map<number, Promise<R> | R>();

        for await (const item of this) {
            if (pending.size >= MAX_LOOKAHEAD_COUNT) {
                assert(pending.has(left));
                const pendingPromise = pending.get(left)!;
                yield await pendingPromise;

                pending.delete(left);
                left += 1;
            }

            pending.set(right, mapper(item));
            right += 1;
        }

        for (; left < right; left += 1) {
            assert(pending.has(left));
            const pendingPromise = pending.get(left)!;

            yield await pendingPromise;

            pending.delete(left);
        }
    }

    async toArray(): Promise<T[]> {
        const result: T[] = [];
        for await (const item of this) {
            result.push(item);
        }

        return result;
    }

    abstract [Symbol.asyncIterator](): AsyncIterator<T>;
}

export class Stream<T> extends AsyncIterableX<T> {
    private readonly source: AsyncIterable<T>;

    constructor(source: AsyncIterable<T>);
    constructor(executor: (writer: ChannelWriter<T>) => Cancel);
    constructor(
        source: AsyncIterable<T> | ((writer: ChannelWriter<T>) => Cancel)
    );
    constructor(
        source: AsyncIterable<T> | ((writer: ChannelWriter<T>) => Cancel)
    ) {
        super();

        if (Symbol.asyncIterator in source) {
            this.source = source;
        } else {
            this.source = new AsyncIteratorFactory(source);
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        return this.source[Symbol.asyncIterator]();
    }
}

export class Cursor<T> extends AsyncIterableX<T> {
    private isConsumed = false;

    constructor(private readonly iter: AsyncIterator<T>) {
        super();
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        if (this.isConsumed) {
            throw new Error('Cursor already consumed');
        }
        this.isConsumed = true;

        return this.iter;
    }
}

export function toCursor<T>(
    source: AsyncIterator<T> | AsyncIterable<T>
): Cursor<T> {
    if (Symbol.asyncIterator in source) {
        return new Cursor(source[Symbol.asyncIterator]());
    }

    return new Cursor(source);
}
