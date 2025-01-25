import {Observer, Unsubscribe} from '../../utils.js';

export interface TransportServer<T> {
    launch(cb: (connection: Connection<T>) => void): Promise<void>;
    close(): Promise<void>;
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

export interface ConnectionObserver<T> extends Observer<T> {
    reconnect?: () => Promise<void>;
}

export interface Connection<T> {
    send(message: T): Promise<void>;
    subscribe(observer: ConnectionObserver<T>): Unsubscribe;
    close(): Promise<void>;
}
