import {Unsubscribe} from '../../utils';
import {Message} from './message';

export interface TransportServer {
    launch(cb: (connection: Connection) => void): void;
    close(): void;
}

export interface TransportClient {
    connect(): Promise<Connection>;
}

export interface BaseConnectionEvent<TType extends string> {
    readonly type: TType;
}

export interface CloseConnectionEvent extends BaseConnectionEvent<'close'> {}

export interface MessageConnectionEvent extends BaseConnectionEvent<'message'> {
    readonly msg: Message;
}

export type ConnectionEvent = CloseConnectionEvent | MessageConnectionEvent;

export type ConnectionSubscribeCallback = (event: ConnectionEvent) => void;

export interface Connection {
    send(message: Message): Promise<void>;
    subscribe(cb: ConnectionSubscribeCallback): Unsubscribe;
    close(): Promise<void>;
}
