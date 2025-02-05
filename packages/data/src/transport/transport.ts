import {Nothing, Observer, Unsubscribe} from '../utils.js';

export interface TransportServer<T> {
    launch(cb: (connection: Connection<T>) => Nothing): Promise<void>;
    close(): void;
}

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
    close(): void;
}

export class ConnectionClosedError extends Error {
    constructor() {
        super('Connection closed');
    }
}

export async function catchConnectionClosed<T>(
    promise: Promise<T>
): Promise<T | void> {
    try {
        return await promise;
    } catch (error) {
        if (error instanceof ConnectionClosedError) {
            return;
        }
        throw error;
    }
}
