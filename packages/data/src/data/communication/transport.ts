import {Context} from '../../context.js';
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
    send(ctx: Context, message: T): Promise<void>;
    subscribe(ctx: Context, observer: Observer<T>): void;
    close(ctx: Context): Promise<void>;
}
