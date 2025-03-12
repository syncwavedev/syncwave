import {AppError} from '../errors.js';
import {Channel, toStream} from '../stream.js';
import type {Observer} from '../subject.js';
import type {Nothing, Unsubscribe} from '../utils.js';

export interface TransportServer<T> {
    launch(cb: (connection: Connection<T>) => Nothing): Promise<void>;
    close(reason: unknown): void;
}

export class TransportServerUnreachableError extends AppError {}

export interface TransportClient<T> {
    connect(): Promise<Connection<T>>;
}

export interface BaseConnectionEvent<TType extends string> {
    readonly type: TType;
}

export interface CloseConnectionEvent extends BaseConnectionEvent<'close'> {}

export interface MessageConnectionEvent<T>
    extends BaseConnectionEvent<'message'> {
    readonly message: T;
}

export interface Connection<T> {
    send(message: T): Promise<void>;
    subscribe(observer: Observer<T>): Unsubscribe;
    close(reason: unknown): void;
}

export class ConnectionThrowError extends AppError {}

export class ConnectionClosedError extends AppError {
    ignore = false;
}

export function catchConnectionClosed<T>(
    promise: Promise<T>
): Promise<T | void> {
    return promise.catch(error => {
        if (error instanceof ConnectionClosedError) {
            error.ignore = true;
            return;
        }
        throw error;
    });
}

export function getMessageStream<T>(connection: Connection<T>) {
    return toStream(_getMessageAsyncIterable(connection));
}

async function* _getMessageAsyncIterable<T>(connection: Connection<T>) {
    const channel = new Channel<T>();

    const unsub = connection.subscribe({
        next: value => channel.next(value),
        throw: error => channel.throw(error),
        close: () => channel.end(),
    });

    try {
        yield* channel;
    } finally {
        unsub('_getMessageAsyncIterable finally');
    }
}
