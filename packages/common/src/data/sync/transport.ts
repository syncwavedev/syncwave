import {Unsubscribe} from '../../utils';
import {Message} from './message';

export interface TransportServer {
    launch(cb: (connection: Connection) => void): void;
    close(): void;
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
