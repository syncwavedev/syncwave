import {Unsubscribe} from '../../utils';
import {Message} from './message';

export interface TransportServer {
    listen(cb: (connection: Connection) => void): Unsubscribe;
}

export interface TransportClient {
    connect(): Promise<Connection>;
}

export interface Connection {
    send(message: Message): Promise<void>;
    subscribe(cb: (message: Message) => void): Unsubscribe;
    close(): Promise<void>;
}
