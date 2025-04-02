import {Server} from 'http';
import {
    AppError,
    type Codec,
    type Connection,
    ConnectionClosedError,
    context,
    Deferred,
    log,
    type Observer,
    Subject,
    toError,
    type TransportServer,
} from 'syncwave';
import {WebSocket, WebSocketServer} from 'ws';

export interface WsTransportServerOptions<T> {
    readonly codec: Codec<T>;
    readonly server: Server;
}

export class WsTransportServer<T> implements TransportServer<T> {
    private wss: WebSocketServer | undefined;

    constructor(private readonly opt: WsTransportServerOptions<T>) {}

    launch(cb: (connection: Connection<T>) => void): Promise<void> {
        // we need to explicitly capture launchCtx, because
        // wss would call callbacks in an unrelated context
        const launchCtx = context();

        this.wss = new WebSocketServer({server: this.opt.server});

        this.wss.on('connection', (ws: WebSocket) => {
            log.trace('ws server connection');
            launchCtx
                .run(async () => {
                    const conn = new WsConnection<T>(ws, this.opt.codec);
                    cb(conn);
                })
                .catch(error => {
                    log.error(toError(error), 'ws server connection error');
                });
        });

        const listening = new Deferred<void>();

        this.wss.on('listening', () => {
            log.trace('ws server running');
            launchCtx
                .run(async () => {
                    listening.resolve();
                })
                .catch(error => {
                    log.error(toError(error), 'ws server listening error');
                });
        });

        return listening.promise;
    }

    close(_reason: unknown): void {
        if (this.wss) {
            this.wss.close();
        }
        this.opt.server.close();
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
                            (('message' in error &&
                                typeof error.message === 'string' &&
                                error.message.includes(
                                    'WebSocket is not open'
                                )) ||
                                ('code' in error && error.code === 'EPIPE'))
                        ) {
                            resolve(
                                this.subject.throw(
                                    new ConnectionClosedError('ws closed')
                                )
                            );
                        } else {
                            resolve(this.subject.throw(toError(error)));
                        }
                    }
                    resolve();
                } catch (error) {
                    reject(toError(error));
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
        if (
            !this.subject.open ||
            this.ws.readyState === this.ws.CLOSED ||
            this.ws.readyState === this.ws.CLOSING
        ) {
            throw new ConnectionClosedError('ws already closed');
        }
    }

    private setupListeners(): void {
        const capturedCtx = context();

        this.ws.on('message', (rawData: Buffer) => {
            capturedCtx
                .run(async () => {
                    try {
                        const message = this.codec.decode(rawData);
                        await this.subject.next(message);
                    } catch (error) {
                        log.error(toError(error), 'ws.message');
                    }
                })
                .catch(error => {
                    log.error(toError(error), 'ws.message error');
                });
        });

        this.ws.on('error', error => {
            capturedCtx
                .run(async () => {
                    try {
                        log.debug(toError(error), 'WsConnection error');
                        await this.subject.throw(toError(error));
                    } catch (error) {
                        log.error(toError(error), 'ws.error');
                    }
                })
                .catch(error => {
                    log.error(toError(error), 'ws.error error');
                });
        });

        this.ws.on('unexpected-response', () => {
            capturedCtx
                .run(async () => {
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
                })
                .catch(error => {
                    log.error(toError(error), 'ws.unexpected-response error');
                });
        });

        this.ws.on('close', () => {
            capturedCtx
                .run(async () => {
                    log.debug('WsConnection close');
                    this.subject.close('ws close event');
                })
                .catch(error => {
                    log.error(toError(error), 'ws.close error');
                });
        });
    }
}
