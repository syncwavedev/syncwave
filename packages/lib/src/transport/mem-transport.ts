import type {Codec} from '../codec.js';
import {AppError} from '../errors.js';
import {log} from '../logger.js';
import {type Observer, Subject} from '../subject.js';
import type {Unsubscribe} from '../utils.js';
import type {
    Connection,
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
    private subject = new Subject<T>();

    private constructor(private readonly codec: Codec<T>) {}

    async send(message: T) {
        this.ensureOpen();

        log.debug({msg: 'mem connection send: ' + JSON.stringify(message)});

        // don't wait for peer to respond
        await this.peer.receive(this.codec.encode(message));
    }

    subscribe(observer: Observer<T>): Unsubscribe {
        this.ensureOpen();

        log.debug({msg: 'mem connection subscribe'});

        return this.subject.subscribe(observer);
    }

    close(reason: unknown): void {
        log.debug({msg: 'mem connection close'});
        this.subject.close(reason);
        if (this.peer.subject.open) {
            this.peer.close(reason);
        }
    }

    private async receive(rawMessage: Uint8Array): Promise<void> {
        const message = this.codec.decode(rawMessage);
        log.debug({msg: 'mem connection receive: ' + JSON.stringify(message)});
        await this.subject.next(message);
    }

    private ensureOpen() {
        if (!this.subject.open) {
            throw new AppError('connection is closed');
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

    close(): void {
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
            throw new AppError('MemTransportServer: server is not active');
        }

        this.listener(connection);
    }
}
