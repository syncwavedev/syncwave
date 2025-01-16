import {
    Subject,
    assert,
    type Codec,
    type Connection,
    type ConnectionEvent,
    type ConnectionSubscribeCallback,
    type TransportClient,
    type Unsubscribe,
} from 'ground-data';

export interface WsTransportClientOptions<T> {
    readonly url: string;
    readonly codec: Codec<T>;
}

export class WsTransportClient<T> implements TransportClient<T> {
    constructor(private readonly options: WsTransportClientOptions<T>) {}

    connect(): Promise<Connection<T>> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.options.url);
            ws.binaryType = 'arraybuffer';

            ws.addEventListener('open', () => {
                const connection = new WsClientConnection<T>(ws, this.options.codec);
                resolve(connection);
            });

            ws.addEventListener('error', err => {
                reject(err);
            });
        });
    }
}

export class WsClientConnection<T> implements Connection<T> {
    private subject = new Subject<ConnectionEvent<T>>();

    constructor(
        private readonly ws: WebSocket,
        private readonly codec: Codec<T>
    ) {
        this.setupListeners();
    }

    async send(message: T): Promise<void> {
        const data = this.codec.encode(message);
        this.ws.send(data);
    }

    subscribe(cb: ConnectionSubscribeCallback<T>): Unsubscribe {
        return this.subject.subscribe(cb);
    }

    async close(): Promise<void> {
        this.ws.close();
    }

    private setupListeners(): void {
        this.ws.addEventListener('message', event => {
            try {
                assert(event.data instanceof ArrayBuffer);
                const message = this.codec.decode(new Uint8Array(event.data));
                this.subject.next({type: 'message', message});
            } catch (err) {
                console.error('Failed to decode message:', err);
            }
        });

        this.ws.addEventListener('close', () => {
            this.subject.next({type: 'close'});
        });
    }
}
