import {
    AppError,
    Codec,
    Connection,
    Cx,
    Deferred,
    logger,
    Nothing,
    Observer,
    Subject,
    toError,
    TransportServer,
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

    launch(
        cx: Cx,
        cb: (cx: Cx, connection: Connection<T>) => Nothing
    ): Promise<void> {
        this.wss = new WebSocketServer({server: this.opt.server});

        this.wss.on('connection', (ws: WebSocket) => {
            const conn = new WsConnection<T>(ws, this.opt.codec);

            conn.subscribe(Cx.todo(), {
                next: () => Promise.resolve(),
                throw: () => Promise.resolve(),
                close: () => {
                    this.conns = this.conns.filter(x => x !== conn);
                },
            });
            this.conns.push(conn);

            cb(cx, conn);
        });

        const listening = new Deferred<void>();

        this.wss.on('listening', () => {
            listening.resolve(Cx.todo());
        });

        this.wss.on('close', async () => {
            try {
                await this.closeConns(cx);
                this.closeSignal.resolve(cx);
            } catch (error) {
                this.closeSignal.reject(toError(cx, error));
            }
        });

        return listening.promise;
    }

    async close(cx: Cx): Promise<void> {
        if (this.wss) {
            await this.closeConns(cx);
            this.wss.close();
            await this.closeSignal.promise;
        }
    }

    private async closeConns(cx: Cx) {
        await whenAll(
            cx,
            this.conns.map(x => x.close())
        );
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
        this.setupListeners(Cx.todo());
    }

    async send(cx: Cx, message: T): Promise<void> {
        return new Promise((resolve, reject) => {
            const data = this.codec.encode(cx, message);
            this.ws.send(data, (error?: unknown) => {
                if (error) {
                    // eslint-disable-next-line no-restricted-globals
                    const err = new Error();
                    err.cause = error;
                    err.message = 'got message + ' + JSON.stringify(message);
                    return reject(toError(cx, err));
                }
                resolve();
            });
        });
    }

    subscribe(cx: Cx, observer: Observer<T>) {
        return this.subject.subscribe(cx, observer);
    }

    async close(): Promise<void> {
        this.ws.close();
        await this.closedSignal.promise;
    }

    private setupListeners(cx: Cx): void {
        this.ws.on('message', async (rawData: Buffer) => {
            try {
                const message = this.codec.decode(cx, rawData);

                await this.subject.next(Cx.todo(), message);
            } catch (error) {
                logger.error(cx, 'ws.message', error);
            }
        });

        this.ws.on('error', async error => {
            try {
                await this.subject.throw(toError(cx, error));
            } catch (error) {
                logger.error(cx, 'ws.error', error);
            }
        });

        this.ws.on('unexpected-response', async () => {
            try {
                await this.subject.throw(
                    new AppError(cx, 'ws.unexpected response')
                );
            } catch (error) {
                logger.error(cx, 'error during ws.unexpected-response', error);
            }
        });

        this.ws.on('close', async () => {
            try {
                await this.subject.close(Cx.todo());
                this.closedSignal.resolve(Cx.todo());
            } catch (error) {
                this.closedSignal.reject(toError(cx, error));
            }
        });
    }
}
