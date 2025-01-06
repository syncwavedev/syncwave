import {MsgpackrEncoder} from '../../encoder';
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

function clone<T>(value: T): T {
    const encoder = new MsgpackrEncoder();
    return encoder.decode(encoder.encode(value));
}

export class MemConnection implements Connection {
    static create(): [MemConnection, MemConnection] {
        const a = new MemConnection();
        const b = new MemConnection();

        a.peer = b;
        b.peer = a;

        return [a, b];
    }

    private peer!: MemConnection;
    private open = false;

    private subs: Array<ConnectionSubscribeCallback> = [];

    private constructor() {}

    async send(message: Message): Promise<void> {
        this.ensureOpen();

        // don't wait for peer to respond
        this.peer.receive(clone(message));
    }

    subscribe(cb: ConnectionSubscribeCallback): Unsubscribe {
        this.ensureOpen();

        const wrapper: ConnectionSubscribeCallback = (...args) => cb(...args);
        this.subs.push(wrapper);

        return () => {
            this.subs = this.subs.filter(x => x !== wrapper);
        };
    }

    async close(): Promise<void> {
        if (this.open) {
            this.open = false;

            [...this.subs].forEach(cb => cb('close'));
        }
    }

    private async receive(message: Message): Promise<void> {
        if (!this.open) return;

        [...this.subs].forEach(cb => cb('message', message));
    }

    private ensureOpen() {
        if (!this.open) {
            throw new Error('connection is closed');
        }
    }
}

export class MemTransportClient implements TransportClient {
    constructor(private readonly server: MemTransportServer) {}

    async connect(): Promise<Connection> {
        const [a, b] = MemConnection.create();
        this.server._accept(a);
        return b;
    }
}

export class MemTransportServer implements TransportServer {
    private subs: Array<(connection: Connection) => void> = [];

    constructor() {}

    async close(): Promise<void> {
        this.subs = [];
    }

    createClient() {
        return new MemTransportClient(this);
    }

    listen(cb: (connection: Connection) => void): Unsubscribe {
        const wrapper = (conn: Connection) => cb(conn);
        this.subs.push(wrapper);
        return () => (this.subs = this.subs.filter(x => x !== wrapper));
    }

    _accept(connection: MemConnection): void {
        if (this.subs.length === 0) {
            throw new Error('server is not active');
        }

        [...this.subs].forEach(cb => cb(connection));
    }
}
