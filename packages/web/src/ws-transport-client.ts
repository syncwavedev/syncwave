import {
    assert,
    type Codec,
    type Connection,
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
    private callbacks: ConnectionSubscribeCallback<T>[] = [];

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
        // wrap if the same cb is used twice for subscription, so unsubscribe wouldn't filter both out
        const uniqueCb: ConnectionSubscribeCallback<T> = (...args) => cb(...args);
        this.callbacks.push(uniqueCb);

        return () => {
            this.callbacks = this.callbacks.filter(fn => fn !== uniqueCb);
        };
    }

    async close(): Promise<void> {
        this.ws.close();
    }

    private setupListeners(): void {
        this.ws.addEventListener('message', event => {
            try {
                assert(event.data instanceof ArrayBuffer);
                const message = this.codec.decode(new Uint8Array(event.data));
                this.callbacks.forEach(cb => cb({type: 'message', message}));
            } catch (err) {
                console.error('Failed to decode message:', err);
            }
        });

        this.ws.addEventListener('close', () => {
            this.callbacks.forEach(cb => cb({type: 'close'}));
        });
    }
}
