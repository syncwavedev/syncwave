import {Codec} from '../../codec.js';
import {Unsubscribe} from '../../utils.js';
import {
    Connection,
    ConnectionSubscribeCallback,
    TransportClient,
    TransportServer,
} from './transport.js';

export class MemConnection<T> implements Connection<T> {
    static create<T>(codec: Codec<T>): [MemConnection<T>, MemConnection<T>] {
        const a = new MemConnection<T>(codec);
        const b = new MemConnection<T>(codec);

        a.peer = b;
        b.peer = a;

        return [a, b];
    }

    private peer!: MemConnection<T>;
    private open = true;

    private subs: Array<ConnectionSubscribeCallback<T>> = [];

    private constructor(private readonly codec: Codec<T>) {}

    async send(message: T): Promise<void> {
        this.ensureOpen();

        // don't wait for peer to respond
        this.peer
            .receive(this.codec.decode(this.codec.encode(message)))
            .catch(err => {
                console.error('error during peer receive', err);
            });
    }

    subscribe(cb: ConnectionSubscribeCallback<T>): Unsubscribe {
        this.ensureOpen();

        const wrapper: ConnectionSubscribeCallback<T> = (...args) =>
            cb(...args);
        this.subs.push(wrapper);

        return () => {
            this.subs = this.subs.filter(x => x !== wrapper);
        };
    }

    async close(): Promise<void> {
        if (this.open) {
            this.open = false;

            [...this.subs].forEach(cb => cb({type: 'close'}));
        }
    }

    private async receive(message: T): Promise<void> {
        if (!this.open) return;

        [...this.subs].forEach(cb => cb({type: 'message', message: message}));
    }

    private ensureOpen() {
        if (!this.open) {
            throw new Error('connection is closed');
        }
    }
}

export class MemTransportClient<T> implements TransportClient<T> {
    constructor(
        private readonly server: MemTransportServer<T>,
        private readonly codec: Codec<T>
    ) {}

    async connect(): Promise<Connection<T>> {
        const [a, b] = MemConnection.create<T>(this.codec);
        this.server.accept(a);
        return b;
    }
}

export class MemTransportServer<T> implements TransportServer<T> {
    private listener?: (connection: Connection<T>) => void;

    constructor(private readonly codec: Codec<T>) {}

    async close(): Promise<void> {
        this.listener = undefined;
    }

    createClient() {
        return new MemTransportClient(this, this.codec);
    }

    launch(cb: (connection: Connection<T>) => void): Promise<void> {
        this.listener = cb;
        return Promise.resolve();
    }

    accept(connection: MemConnection<T>): void {
        if (this.listener === undefined) {
            throw new Error('server is not active');
        }

        this.listener(connection);
    }
}
