import {Channel as AsyncChannel} from 'async-channel';
import {merge, of} from 'ix/Ix.asynciterable';
import {MAX_LOOKAHEAD_COUNT} from './constants.js';
import {Cursor, toCursor} from './cursor.js';
import {
    createPromiseStatePending,
    Deferred,
    type PromiseState,
} from './deferred.js';
import {AppError, CancelledError, toError} from './errors.js';
import {log} from './logger.js';
import {assert, assertNever, type Unsubscribe, whenAll} from './utils.js';

export interface ChannelWriter<T> {
    next: (value: T) => Promise<void>;
    throw: (error: AppError) => Promise<void>;
    end: () => void;
}

export class Channel<T> implements AsyncIterable<T>, ChannelWriter<T> {
    private chan = new AsyncChannel<T>();

    async next(value: T) {
        await this.chan.push(value);
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

export class AsyncIteratorFactory<T> implements AsyncIterable<T> {
    private readonly iterators: Array<AsyncIterator<T>> = [];
    private closed = false;

    constructor(
        private readonly execute: (channel: ChannelWriter<T>) => Unsubscribe
    ) {}

    [Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        if (this.closed) {
            throw new AppError('AsyncIteratorFactory closed');
        }
        const iterator = this._createIterator();
        this.iterators.push(iterator);

        return iterator;
    }

    close() {
        this.closed = true;
        Promise.resolve()
            .then(() =>
                whenAll(
                    this.iterators
                        .map(x => x.return?.())
                        .filter(x => x !== undefined)
                )
            )
            .catch(error =>
                log.error({
                    error,
                    msg: 'AsyncIteratorFactory.returnAll: failed to return all iterators',
                })
            );
    }

    private async *_createIterator(): AsyncIterator<T, any, any> {
        const channel = new Channel<T>();

        const cancel = this.execute(channel);
        try {
            yield* channel;
        } finally {
            cancel?.('_createIterator finally');
        }
    }
}

export function toStream<T>(
    source:
        | AsyncIterable<T>
        | T[]
        | Promise<T>
        | ((writer: ChannelWriter<T>) => Unsubscribe)
): Stream<T> {
    if (source instanceof Stream) {
        return source as Stream<T>;
    }

    if (source instanceof Promise) {
        const factory = new AsyncIteratorFactory<T>(channel => {
            source
                .then(value => channel.next(value))
                .catch(error => channel.throw(toError(error)))
                .finally(() => channel.end());

            return () => {
                channel
                    .throw(
                        new CancelledError(
                            'toStream unsubscribe',
                            'toStream unsubscribe'
                        )
                    )
                    .finally(() => channel.end())
                    .catch(error => {
                        log.error({
                            error,
                            msg: 'toStream unsubscribe',
                        });
                    });
            };
        });
        return toStream(factory);
    }

    if (Array.isArray(source)) {
        return toStream(of(...source));
    }

    return new Stream(source);
}

export class Stream<T> implements AsyncIterable<T> {
    static merge<T>(sources: AsyncIterable<T>[]): Stream<T> {
        const init: AsyncIterable<T> = toStream<T>([]);
        return toStream<T>(merge(init, ...sources));
    }

    private readonly source: AsyncIterable<T>;

    protected createInstance<U>(source: AsyncIterable<U>): Stream<U> {
        return new Stream<U>(source);
    }

    constructor(source: AsyncIterable<T>);
    constructor(executor: (writer: ChannelWriter<T>) => Unsubscribe);
    constructor(
        source: AsyncIterable<T> | ((writer: ChannelWriter<T>) => Unsubscribe)
    );
    constructor(
        source: AsyncIterable<T> | ((writer: ChannelWriter<T>) => Unsubscribe)
    ) {
        if (Symbol.asyncIterator in source) {
            this.source = source;
        } else {
            this.source = new AsyncIteratorFactory(source);
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        return this.source[Symbol.asyncIterator]();
    }

    conflate(): Stream<T> {
        return toStream(this._conflateLatest());
    }

    private async *_conflateLatest() {
        let eventSignal = new Deferred<IteratorResult<T>>();
        let running = true;

        const resolve = (result: IteratorResult<T>) => {
            eventSignal.resolve(result);

            eventSignal = new Deferred();
            eventSignal.resolve(result);
        };

        const reject = (error: AppError) => {
            eventSignal.reject(error);

            eventSignal = new Deferred();
            eventSignal.reject(error);
        };

        (async () => {
            try {
                for await (const value of this) {
                    if (!running) return;

                    resolve({done: false, value});
                }
            } catch (error) {
                reject(toError(error));
            } finally {
                resolve({done: true, value: undefined});
            }
        })().catch(error => {
            reject(toError(error));
        });

        try {
            while (true) {
                const eventPromise = eventSignal.promise;
                if (eventSignal.state !== 'pending') {
                    eventSignal = new Deferred();
                }
                const event = await eventPromise;

                if (event.done === true) {
                    return;
                }
                yield event.value;
            }
        } finally {
            running = false;
        }
    }

    async count() {
        let result = 0;
        for await (const _ of this) {
            result += 1;
        }

        return result;
    }

    async reduce<R>(
        reducer: (accumulator: R, value: T) => R | Promise<R>,
        initialValue: R
    ): Promise<R> {
        let result = initialValue;
        for await (const item of this) {
            result = await reducer(result, item);
        }
        return result;
    }

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

    assert<S extends T>(
        validator: (value: T) => value is S,
        message: string
    ): Stream<S> {
        return toStream(this._assert(validator, message)) as Stream<S>;
    }

    private async *_assert(
        validator: (value: T) => boolean,
        message: string
    ): AsyncIterable<T> {
        for await (const item of this) {
            assert(validator(item), message);

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

    async first(): Promise<T> {
        for await (const item of this) {
            return item;
        }

        throw new AppError('Stream.first: stream ended');
    }

    async firstOrDefault(): Promise<T | undefined> {
        for await (const item of this) {
            return item;
        }

        return undefined;
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

    private async *_finally(fn: () => void) {
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

    until(signal: Promise<void>): Stream<T> {
        return toStream(this._until(signal));
    }

    private async *_until(signal: Promise<void>): AsyncIterable<T> {
        let signalState: PromiseState<undefined> = createPromiseStatePending();
        signal
            .then(() => {
                signalState = {type: 'fulfilled', value: undefined};
            })
            .catch(reason => {
                signalState = {type: 'rejected', reason};
            });

        for await (const item of this) {
            if (signalState.type === 'pending') {
                yield item;
            } else if (signalState.type === 'fulfilled') {
                return;
            } else if (signalState.type === 'rejected') {
                throw signalState.reason;
            } else {
                assertNever(signalState);
            }
        }
    }

    while<S extends T>(predicate: (value: T) => value is S): Stream<S>;
    while(predicate: (value: T) => Promise<boolean> | boolean): Stream<T>;
    while(
        predicate:
            | ((value: T) => Promise<boolean> | boolean)
            | ((value: T) => value is T)
    ): Stream<T> {
        return toStream(this._while(predicate));
    }

    private async *_while(
        predicate: (value: T) => Promise<boolean> | boolean
    ): AsyncIterable<T> {
        for await (const item of this) {
            if (!(await predicate(item))) break;
            yield item;
        }
    }

    whileInclusive<S extends T>(predicate: (value: T) => value is S): Stream<S>;
    whileInclusive(
        predicate: (value: T) => Promise<boolean> | boolean
    ): Stream<T>;
    whileInclusive(
        predicate:
            | ((value: T) => Promise<boolean> | boolean)
            | ((value: T) => value is T)
    ): Stream<T> {
        return toStream(this._whileInclusive(predicate));
    }

    private async *_whileInclusive(
        predicate: (value: T) => Promise<boolean> | boolean
    ): AsyncIterable<T> {
        for await (const item of this) {
            yield item;
            if (!(await predicate(item))) break;
        }
    }

    filter<S extends T>(predicate: (value: T) => value is S): Stream<S>;
    filter(predicate: (value: T) => Promise<boolean> | boolean): Stream<T>;
    filter(
        predicate:
            | ((value: T) => Promise<boolean> | boolean)
            | ((value: T) => value is T)
    ): Stream<T> {
        return toStream(this._filter(predicate));
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

    map<R>(mapper: (value: T, index: number) => R | Promise<R>): Stream<R> {
        return toStream(this._map(mapper));
    }

    toCursor(): Cursor<T> {
        return new Cursor(this[Symbol.asyncIterator]());
    }

    private async *_map<R>(
        mapper: (value: T, index: number) => R | Promise<R>
    ): AsyncIterable<R> {
        let index = 0;
        for await (const item of this) {
            yield await mapper(item, index);
            index += 1;
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
                assert(
                    pending.has(left),
                    'mapParallel: left promise not found'
                );
                const pendingPromise = pending.get(left)!;
                yield await pendingPromise;

                pending.delete(left);
                left += 1;
            }

            pending.set(right, mapper(item));
            right += 1;
        }

        for (; left < right; left += 1) {
            assert(pending.has(left), 'mapParallel: left promise not found');
            const pendingPromise = pending.get(left)!;

            yield await pendingPromise;

            pending.delete(left);
        }
    }

    async consume(): Promise<void> {
        for await (const _ of this) {
            // do nothing
        }
    }

    async toArray(): Promise<T[]> {
        const result: T[] = [];
        for await (const item of this) {
            result.push(item);
        }

        return result;
    }

    partition<S extends T>(
        predicate: (value: T) => value is S
    ): [Cursor<S>, Cursor<Exclude<T, S>>];
    partition(
        predicate: (value: T) => Promise<boolean> | boolean
    ): [Cursor<T>, Cursor<T>];
    partition<S extends T>(
        predicate:
            | ((value: T) => value is S)
            | ((value: T) => Promise<boolean> | boolean)
    ): [Cursor<S>, Cursor<Exclude<T, S>>] | [Cursor<T>, Cursor<T>] {
        const truthyChan = new Channel<T>();
        const falsyChan = new Channel<T>();

        (async () => {
            try {
                for await (const item of this) {
                    if (await predicate(item)) {
                        await truthyChan.next(item);
                    } else {
                        await falsyChan.next(item);
                    }
                }
            } catch (error) {
                await whenAll([
                    truthyChan.throw(error),
                    falsyChan.throw(error),
                ]);
            } finally {
                truthyChan.end();
                falsyChan.end();
            }
        })().catch(error => {
            log.error({error, msg: 'stream partition failed'});
        });

        return [toCursor(truthyChan), toCursor(falsyChan)] as [
            Cursor<S>,
            Cursor<Exclude<T, S>>,
        ];
    }
}

export interface ObservableOptions<T> {
    get: () => Promise<T>;
    update$: Promise<Cursor<void>>;
}

export async function* observable<T>(
    options: ObservableOptions<T>
): AsyncIterable<T> {
    // we need to open updates cursor before getting the initial value
    // to ensure that we don't miss any updates in between initial value and updates cursor opening
    const updateCursor = await options.update$;
    yield await options.get();

    yield* updateCursor.map(async () => await options.get());
}
