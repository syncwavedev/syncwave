import {Unsubscribe} from '../../utils';
import {Message} from './message';

export interface TransportServer {
    listen(cb: (connection: Connection) => void): Unsubscribe;
    close(): Promise<void>;
}

export interface TransportClient {
    connect(): Promise<Connection>;
}

export type ConnectionSubscribeCallback = (...args: [type: 'close'] | [type: 'message', message: Message]) => void;

export interface Connection {
    send(message: Message): Promise<void>;
    subscribe(cb: ConnectionSubscribeCallback): Unsubscribe;
    close(): Promise<void>;
}
