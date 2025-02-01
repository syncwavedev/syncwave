import {
    Codec,
    Connection,
    context,
    Deferred,
    logger,
    Nothing,
    Observer,
    Subject,
    toError,
    TransportServer,
} from 'ground-data';
import {Server} from 'http';
import {WebSocket, WebSocketServer} from 'ws';

export interface WsTransportServerOptions<T> {
    readonly codec: Codec<T>;
    readonly server: Server;
}

export class WsTransportServer<T> implements TransportServer<T> {
    private wss: WebSocketServer | undefined;
    private readonly closeSignal = new Deferred<void>();

    constructor(private readonly opt: WsTransportServerOptions<T>) {}

    launch(cb: (connection: Connection<T>) => Nothing): Promise<void> {
        // we need to explicitly capture launchCtx, because
        // wss would call callbacks in an unrelated context
        const launchCtx = context();

        this.wss = new WebSocketServer({server: this.opt.server});

        this.wss.on('connection', (ws: WebSocket) => {
            launchCtx.run(async () => {
                const conn = new WsConnection<T>(ws, this.opt.codec);
                cb(conn);
            });
        });

        const listening = new Deferred<void>();

        this.wss.on('listening', () => {
            launchCtx.run(async () => {
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
        logger.debug('WsConnection send', message);
        return new Promise((resolve, reject) => {
            const data = this.codec.encode(message);
            this.ws.send(data, (error?: unknown) => {
                try {
                    if (error) {
                        const err = new Error();
                        err.cause = error;
                        err.message = 'got message: ' + JSON.stringify(message);
                        resolve(this.subject.throw(err));
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    subscribe(observer: Observer<T>) {
        logger.debug('WsConnection subscribe');
        return this.subject.subscribe(observer);
    }

    close(): void {
        logger.debug('WsConnection close');
        this.ws.close();
    }

    private setupListeners(): void {
        const capturedCtx = context();

        this.ws.on('message', (rawData: Buffer) => {
            capturedCtx.run(async () => {
                try {
                    const message = this.codec.decode(rawData);
                    const {headers: _, ...messageWithoutHeaders} =
                        message as any;
                    logger.debug('WsConnection message', messageWithoutHeaders);

                    await this.subject.next(message);
                } catch (error) {
                    logger.error('ws.message', error);
                }
            });
        });

        this.ws.on('error', error => {
            capturedCtx.run(async () => {
                try {
                    logger.debug('WsConnection error', error);
                    await this.subject.throw(toError(error));
                } catch (error) {
                    logger.error('ws.error', error);
                }
            });
        });

        this.ws.on('unexpected-response', () => {
            capturedCtx.run(async () => {
                try {
                    logger.debug('WsConnection unexpected-response');
                    await this.subject.throw(
                        new Error('ws.unexpected response')
                    );
                } catch (error) {
                    logger.error('error during ws.unexpected-response', error);
                }
            });
        });

        this.ws.on('close', () => {
            capturedCtx.run(async () => {
                logger.debug('WsConnection close');
                this.subject.close();
            });
        });
    }
}
