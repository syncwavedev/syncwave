import WebSocket from 'isomorphic-ws';
import {
    AppError,
    assert,
    ConnectionClosedError,
    log,
    Subject,
    toError,
    TransportServerUnreachableError,
    type Codec,
    type Connection,
    type Observer,
    type TransportClient,
    type Unsubscribe,
} from 'syncwave';

export interface WsTransportClientOptions<T> {
    readonly url: string;
    readonly codec: Codec<T>;
}

export class WsTransportClient<T> implements TransportClient<T> {
    constructor(private readonly opt: WsTransportClientOptions<T>) {}

    connect(): Promise<Connection<T>> {
        log.trace('ws connect');

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.opt.url);
            ws.binaryType = 'arraybuffer';

            ws.addEventListener('open', () => {
                log.trace('ws connect: open');
                const connection = new WsClientConnection<T>(
                    ws,
                    this.opt.codec
                );
                resolve(connection);
            });

            ws.addEventListener('error', err => {
                log.trace('ws connect: error: ' + err.message);
                const codes = [
                    'ECONNRESET',
                    'ECONNREFUSED',
                    'ETIMEDOUT',
                    'EPIPE',
                ];
                // err.message might be undefined
                if (codes.some(code => err.message?.includes(code))) {
                    reject(new TransportServerUnreachableError(err.message));
                } else {
                    reject(err);
                }
            });
        });
    }
}

export class WsClientConnection<T> implements Connection<T> {
    private subject = new Subject<T>();

    constructor(
        private readonly ws: WebSocket,
        private readonly codec: Codec<T>
    ) {
        this.setupListeners();

        this.subscribe({
            next: async msg => {
                log.trace('ws got: ' + JSON.stringify(msg));
            },
            throw: async err => {
                log.error(err, 'ws err');
            },
            close: () => {
                log.info('ws closed');
            },
        });
    }

    send(message: T): Promise<void> {
        this.ensureReady();

        log.trace('ws client: send: ' + JSON.stringify(message));
        const data = this.codec.encode(message);
        this.ws.send(data);

        return Promise.resolve();
    }

    subscribe(cb: Observer<T>): Unsubscribe {
        this.ensureReady();
        log.trace('ws subscribe');
        return this.subject.subscribe(cb);
    }

    close(): void {
        log.trace('ws client: close');
        this.ws.close();
    }

    private ensureReady() {
        if (
            this.ws.readyState === this.ws.CLOSED ||
            this.ws.readyState === this.ws.CLOSING
        ) {
            throw new ConnectionClosedError('ws client closed');
        }
        if (this.ws.readyState === this.ws.CONNECTING) {
            throw new AppError('ws client is not open');
        }
    }

    private setupListeners(): void {
        this.ws.addEventListener('message', async event => {
            try {
                assert(
                    event.data instanceof ArrayBuffer,
                    'ws message not an ArrayBuffer'
                );
                const message = this.codec.decode(new Uint8Array(event.data));
                await this.subject.next(message);
            } catch (error) {
                log.error(toError(error), 'error during ws message');
            }
        });

        this.ws.addEventListener('error', async error => {
            log.error(
                toError(error),
                'ws client: error event: ' + error.message
            );
            try {
                await this.subject.throw(
                    new AppError('ws.error: ' + error.toString())
                );
            } catch (error) {
                log.error(toError(error), 'error during ws error');
            }
        });

        this.ws.addEventListener('close', () => {
            log.trace('ws client: close event');
            this.subject.close('ws client: close event');
        });
    }
}
