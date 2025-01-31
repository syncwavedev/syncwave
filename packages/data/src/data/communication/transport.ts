import {Cx} from '../../context.js';
import {Nothing, Observer} from '../../utils.js';

export interface TransportServer<T> {
    launch(cb: (connection: Connection<T>) => Nothing): Promise<void>;
    close(cx: Cx): Promise<void>;
}

export interface TransportClient<T> {
    connect(cx: Cx): Promise<Connection<T>>;
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
    subscribe(observer: Observer<T>): void;
    close(cx: Cx): Promise<void>;
}
