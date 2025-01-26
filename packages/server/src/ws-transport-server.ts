import {
    Codec,
    Connection,
    Deferred,
    Observer,
    Subject,
    TransportServer,
    Unsubscribe,
    whenAll,
} from 'ground-data';
import {Server} from 'http';
import {WebSocket, WebSocketServer} from 'ws';

export interface WsTransportServerOptions<T> {
    readonly codec: Codec<T>;
    readonly server: Server;
}

export class WsTransportServer<T> implements TransportServer<T> {
    private wss: WebSocketServer | undefined;
    private conns: WsConnection<T>[] = [];
    private readonly closeSignal = new Deferred<void>();

    constructor(private readonly opt: WsTransportServerOptions<T>) {}

    launch(cb: (connection: Connection<T>) => void): Promise<void> {
        this.wss = new WebSocketServer({server: this.opt.server});

        this.wss.on('connection', (ws: WebSocket) => {
            const conn = new WsConnection<T>(ws, this.opt.codec);

            conn.subscribe({
                next: () => Promise.resolve(),
                throw: () => Promise.resolve(),
                close: async () => {
                    this.conns = this.conns.filter(x => x !== conn);
                },
            });
            this.conns.push(conn);

            cb(conn);
        });

        const listening = new Deferred<void>();

        this.wss.on('listening', () => {
            listening.resolve();
        });

        this.wss.on('close', async () => {
            try {
                await this.closeConns();
                this.closeSignal.resolve();
            } catch (error) {
                this.closeSignal.reject(error);
            }
        });

        return listening.promise;
    }

    async close(): Promise<void> {
        if (this.wss) {
            await this.closeConns();
            this.wss.close();
            await this.closeSignal.promise;
        }
    }

    private async closeConns() {
        await whenAll(this.conns.map(x => x.close()));
        this.conns = [];
    }
}

export class WsConnection<T> implements Connection<T> {
    private subject = new Subject<T>();
    private closedSignal = new Deferred<void>();

    constructor(
        private readonly ws: WebSocket,
        private readonly codec: Codec<T>
    ) {
        this.setupListeners();
    }

    async send(message: T): Promise<void> {
        return new Promise((resolve, reject) => {
            const data = this.codec.encode(message);
            this.ws.send(data, (error?: Error) => {
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        });
    }

    subscribe(observer: Observer<T>): Unsubscribe {
        return this.subject.subscribe(observer);
    }

    async close(): Promise<void> {
        this.ws.close();
        await this.closedSignal.promise;
    }

    private setupListeners(): void {
        this.ws.on('message', async (rawData: Buffer) => {
            try {
                const message = this.codec.decode(rawData);

                await this.subject.next(message);
            } catch (error) {
                console.error('[ERR] error during ws message', error);
            }
        });

        this.ws.on('error', async error => {
            try {
                await this.subject.throw(error);
            } catch (error) {
                console.error('[ERR] error during ws.error', error);
            }
        });

        this.ws.on('unexpected-response', async () => {
            try {
                await this.subject.throw(new Error('ws.unexpected response'));
            } catch (error) {
                console.error(
                    '[ERR] error during ws.unexpected-response',
                    error
                );
            }
        });

        this.ws.on('close', async () => {
            try {
                await this.subject.close();
                this.closedSignal.resolve();
            } catch (error) {
                this.closedSignal.reject(error);
            }
        });
    }
}
