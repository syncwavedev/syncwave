import {AppError, toError} from './errors.js';
import {log} from './logger.js';

export class Cursor<T> implements AsyncIterable<T> {
    private _isConsumed = false;

    constructor(private readonly iter: AsyncIterator<T>) {}

    [Symbol.asyncIterator](): AsyncIterator<T> {
        if (this._isConsumed) {
            throw new AppError('Cursor already consumed');
        }
        this._isConsumed = true;

        return this.iter;
    }

    get isConsumed() {
        return this._isConsumed;
    }

    async first(): Promise<T> {
        for await (const item of this) {
            return item;
        }

        throw new AppError('Cursor.first: stream ended');
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

    concat(...iterables: AsyncIterable<T>[]): Cursor<T> {
        return toCursor(this._concat(...iterables));
    }

    private async *_concat(...iterables: AsyncIterable<T>[]) {
        yield* this;

        for (const stream of iterables) {
            yield* stream;
        }
    }

    map<R>(mapper: (value: T) => R | Promise<R>): Cursor<R> {
        return toCursor(this._map(mapper));
    }

    private async *_map<R>(
        mapper: (value: T) => R | Promise<R>
    ): AsyncIterable<R> {
        for await (const item of this) {
            yield await mapper(item);
        }
    }

    finally(fn: () => undefined | void): Cursor<T> {
        return toCursor(this._finally(fn));
    }

    private async *_finally(fn: () => void) {
        try {
            yield* this;
        } finally {
            fn();
        }
    }

    close() {
        if (this._isConsumed) return;

        this.iter.return?.().catch(error => {
            log.error({error: toError(error), msg: 'failed to close cursor'});
        });
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
