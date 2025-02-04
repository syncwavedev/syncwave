import {logger} from './logger.js';
import {Nothing} from './utils.js';

export class Cursor<T> implements AsyncIterable<T> {
    private isConsumed = false;

    constructor(private readonly iter: AsyncIterator<T>) {}

    [Symbol.asyncIterator](): AsyncIterator<T> {
        if (this.isConsumed) {
            throw new Error('Cursor already consumed');
        }
        this.isConsumed = true;

        return this.iter;
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

    private async *_finally(fn: () => Nothing) {
        try {
            yield* this;
        } finally {
            fn();
        }
    }

    close() {
        if (this.isConsumed) return;

        this.iter.return?.().catch(error => {
            logger.error('failed to close cursor', error);
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
