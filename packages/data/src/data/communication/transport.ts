import {Unsubscribe} from '../../utils.js';

export interface TransportServer<T> {
    launch(cb: (connection: Connection<T>) => void): Promise<void>;
    close(): void;
}

export interface TransportClient<T> {
    connect(): Promise<Connection<T>>;
}

export interface BaseConnectionEvent<TType extends string> {
    readonly type: TType;
}

export interface CloseConnectionEvent extends BaseConnectionEvent<'close'> {}

export interface MessageConnectionEvent<T> extends BaseConnectionEvent<'message'> {
    readonly message: T;
}

export type ConnectionEvent<T> = CloseConnectionEvent | MessageConnectionEvent<T>;

export type ConnectionSubscribeCallback<T> = (event: ConnectionEvent<T>) => void;

export interface Connection<T> {
    send(message: T): Promise<void>;
    subscribe(cb: ConnectionSubscribeCallback<T>): Unsubscribe;
    close(): Promise<void>;
}
