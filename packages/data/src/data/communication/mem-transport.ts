import {Codec} from '../../codec.js';
import {Observer, Subject, Unsubscribe} from '../../utils.js';
import {Connection, TransportClient, TransportServer} from './transport.js';

export class MemConnection<T> implements Connection<T> {
    static create<T>(codec: Codec<T>): [MemConnection<T>, MemConnection<T>] {
        const a = new MemConnection<T>(codec);
        const b = new MemConnection<T>(codec);

        a.peer = b;
        b.peer = a;

        return [a, b];
    }

    private peer!: MemConnection<T>;
    private subject = new Subject<T>();

    private constructor(private readonly codec: Codec<T>) {}

    async send(message: T): Promise<void> {
        this.ensureOpen();

        // don't wait for peer to respond
        this.peer.receive(this.codec.encode(message)).catch(err => {
            console.error('error during peer receive', err);
        });
    }

    subscribe(observer: Observer<T>): Unsubscribe {
        this.ensureOpen();

        return this.subject.subscribe(observer);
    }

    async close(): Promise<void> {
        await this.subject.close();
        if (this.peer.subject.open) {
            // don't wait for peer to respond
            this.peer.close().catch(err => {
                console.error('error during peer receive', err);
            });
        }
    }

    private async receive(message: Uint8Array): Promise<void> {
        await this.subject.next(this.codec.decode(message));
    }

    private ensureOpen() {
        if (!this.subject.open) {
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
