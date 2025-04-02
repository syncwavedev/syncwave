import type {Observer} from '../subject.js';
import {checkValue} from '../type.js';
import {type Unsubscribe} from '../utils.js';
import {zRpcMessage, type RpcMessage} from './rpc-message.js';
import type {
    Connection,
    TransportClient,
    TransportServer,
} from './transport.js';

const messageSchema = zRpcMessage();

export class RpcConnection implements Connection<RpcMessage> {
    constructor(private readonly conn: Connection<unknown>) {}

    async send(message: RpcMessage): Promise<void> {
        await this.conn.send(this.parse(message));
    }

    subscribe(observer: Observer<RpcMessage>): Unsubscribe {
        return this.conn.subscribe({
            next: message => observer.next(this.parse(message)),
            throw: error => observer.throw(error),
            close: reason => observer.close(reason),
        });
    }
    close(reason: unknown): void {
        this.conn.close(reason);
    }

    private parse(data: unknown) {
        return checkValue(messageSchema, data);
    }
}

export class RpcTransportServer implements TransportServer<RpcMessage> {
    constructor(private readonly server: TransportServer<unknown>) {}

    async launch(cb: (connection: RpcConnection) => void): Promise<void> {
        await this.server.launch(conn => {
            cb(new RpcConnection(conn));
        });
    }
    close(reason: unknown): void {
        this.server.close(reason);
    }
}

export class RpcTransportClient implements TransportClient<RpcMessage> {
    constructor(private readonly client: TransportClient<unknown>) {}

    async connect(): Promise<RpcConnection> {
        const conn = await this.client.connect();
        return new RpcConnection(conn);
    }
}
