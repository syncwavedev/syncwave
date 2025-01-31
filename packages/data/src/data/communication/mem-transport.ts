import {Codec} from '../../codec.js';
import {Cx} from '../../context.js';
import {Error} from '../../errors.js';
import {logger} from '../../logger.js';
import {Nothing, Observer, Subject, wait} from '../../utils.js';
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
        this.ensureOpen(cx);

        await wait(cx, 0);

        // don't wait for peer to respond
        this.peer.receive(this.codec.encode(cx, message)).catch(err => {
            logger.error(cx, 'error during peer receive', err);
        });
    }

    subscribe(observer: Observer<T>) {
        this.ensureOpen(cx);

        this.subject.subscribe(cx, observer);
    }

    async close(cx: Cx): Promise<void> {
        await this.subject.close(cx);
        if (this.peer.subject.open) {
            // don't wait for peer to respond
            this.peer.close(cx).catch(err => {
                logger.error(cx, 'error during peer receive', err);
            });
        }
    }

    private async receive(message: Uint8Array): Promise<void> {
        const cx = Cx.background();
        await this.subject.next(cx, this.codec.decode(cx, message));
    }

    private ensureOpen(cx: Cx) {
        if (!this.subject.open) {
            throw new Error(cx, 'connection is closed');
        }
    }
}

export class MemTransportClient<T> implements TransportClient<T> {
    constructor(
        private readonly server: MemTransportServer<T>,
        private readonly codec: Codec<T>
    ) {}

    async connect(cx: Cx): Promise<Connection<T>> {
        const [a, b] = MemConnection.create<T>(this.codec);
        this.server.accept(cx, a);
        return b;
    }
}

export class MemTransportServer<T> implements TransportServer<T> {
    private listener?: (connection: Connection<T>) => Nothing;

    constructor(private readonly codec: Codec<T>) {}

    async close(): Promise<void> {
        this.listener = undefined;
    }

    createClient() {
        return new MemTransportClient(this, this.codec);
    }

    launch(cb: (connection: Connection<T>) => Nothing): Promise<void> {
        this.listener = cb;
        return Promise.resolve();
    }

    accept(connection: MemConnection<T>): void {
        if (this.listener === undefined) {
            throw new Error(cx, 'server is not active');
        }

        this.listener(Cx.todo(), connection);
    }
}
