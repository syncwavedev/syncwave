import {Server} from 'http';
import {
    AppError,
    Codec,
    Connection,
    ConnectionClosedError,
    context,
    Deferred,
    log,
    Nothing,
    Observer,
    Subject,
    toError,
    TransportServer,
} from 'syncwave-data';
import {WebSocket, WebSocketServer} from 'ws';

export interface WsTransportServerOptions<T> {
    readonly codec: Codec<T>;
    readonly server: Server;
}

export class WsTransportServer<T> implements TransportServer<T> {
    private wss: WebSocketServer | undefined;

    constructor(private readonly opt: WsTransportServerOptions<T>) {}

    launch(cb: (connection: Connection<T>) => Nothing): Promise<void> {
        // we need to explicitly capture launchCtx, because
        // wss would call callbacks in an unrelated context
        const launchCtx = context();

        this.wss = new WebSocketServer({server: this.opt.server});

        this.wss.on('connection', async (ws: WebSocket) => {
            log.trace('ws server connection');
            await launchCtx.run(async () => {
                const conn = new WsConnection<T>(ws, this.opt.codec);
                cb(conn);
            });
        });

        const listening = new Deferred<void>();

        this.wss.on('listening', async () => {
            log.trace('ws server running');
            await launchCtx.run(async () => {
                listening.resolve();
            });
        });

        return listening.promise;
    }

    close(): void {
        if (this.wss) {
            this.wss.close();
        }
    }
}

export class WsConnection<T> implements Connection<T> {
    private subject = new Subject<T>();

    constructor(
        private readonly ws: WebSocket,
        private readonly codec: Codec<T>
    ) {
        this.setupListeners();
    }

    async send(message: T): Promise<void> {
        this.ensureOpen();
        log.trace('ws.send: ' + JSON.stringify(message));
        return new Promise((resolve, reject) => {
            const data = this.codec.encode(message);
            this.ws.send(data, (error?: unknown) => {
                try {
                    if (error) {
                        if (
                            typeof error === 'object' &&
                            'message' in error &&
                            typeof error.message === 'string' &&
                            error.message.includes('WebSocket is not open')
                        ) {
                            resolve(
                                this.subject.throw(
                                    new ConnectionClosedError('ws closed')
                                )
                            );
                        } else {
                            const err = new AppError(
                                'got message: ' + JSON.stringify(message),
                                {cause: toError(error)}
                            );
                            resolve(this.subject.throw(err));
                        }
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    subscribe(observer: Observer<T>) {
        log.trace('ws.subscribe');
        this.ensureOpen();
        return this.subject.subscribe(observer);
    }

    close(): void {
        this.ws.close();
    }

    private ensureOpen() {
        if (!this.subject.open) {
            throw new ConnectionClosedError('ws already closed');
        }
    }

    private setupListeners(): void {
        const capturedCtx = context();

        this.ws.on('message', async (rawData: Buffer) => {
            await capturedCtx.run(async () => {
                try {
                    const message = this.codec.decode(rawData);
                    await this.subject.next(message);
                } catch (error) {
                    log.error(toError(error), 'ws.message');
                }
            });
        });

        this.ws.on('error', async error => {
            await capturedCtx.run(async () => {
                try {
                    log.debug(toError(error), 'WsConnection error');
                    await this.subject.throw(toError(error));
                } catch (error) {
                    log.error(toError(error), 'ws.error');
                }
            });
        });

        this.ws.on('unexpected-response', async () => {
            await capturedCtx.run(async () => {
                try {
                    log.debug('WsConnection unexpected-response');
                    await this.subject.throw(
                        new AppError('ws.unexpected response')
                    );
                } catch (error) {
                    log.error(
                        toError(error),
                        'error during ws.unexpected-response'
                    );
                }
            });
        });

        this.ws.on('close', async () => {
            await capturedCtx.run(async () => {
                log.debug('WsConnection close');
                this.subject.close();
            });
        });
    }
}
