import {
    Codec,
    Connection,
    Deferred,
    Logger,
    Observer,
    Subject,
    TransportServer,
    Unsubscribe,
} from 'ground-data';
import {Server} from 'http';
import {WebSocket, WebSocketServer} from 'ws';

export interface WsTransportServerOptions<T> {
    readonly codec: Codec<T>;
    readonly logger: Logger;
    readonly server: Server;
}

export class WsTransportServer<T> implements TransportServer<T> {
    private wss: WebSocketServer | undefined;

    constructor(private readonly opt: WsTransportServerOptions<T>) {}

    launch(cb: (connection: Connection<T>) => void): Promise<void> {
        this.wss = new WebSocketServer({server: this.opt.server});

        this.wss.on('connection', (ws: WebSocket) => {
            const connection = new WsConnection<T>(
                ws,
                this.opt.codec,
                this.opt.logger
            );
            cb(connection);
        });

        const listening = new Deferred<void>();

        this.wss.on('listening', () => {
            listening.resolve();
        });

        return listening.promise;
    }

    close(): void {
        this.wss?.close();
    }
}

export class WsConnection<T> implements Connection<T> {
    private subject = new Subject<T>();
    private closedSignal = new Deferred<void>();

    constructor(
        private readonly ws: WebSocket,
        private readonly codec: Codec<T>,
        private readonly logger: Logger
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
