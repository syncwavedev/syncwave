import {Cancellation} from '../../cancellation.js';
import {Observer} from '../../utils.js';

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

export interface Connection<T> {
    send(message: T): Promise<void>;
    subscribe(observer: Observer<T>, cx: Cancellation): void;
    close(): Promise<void>;
}
