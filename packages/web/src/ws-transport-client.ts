import {
	Cancellation,
	Deferred,
	Subject,
	assert,
	type Codec,
	type Connection,
	type Logger,
	type Observer,
	type TransportClient,
} from 'ground-data';

export interface WsTransportClientOptions<T> {
	readonly url: string;
	readonly codec: Codec<T>;
	readonly logger: Logger;
}

export class WsTransportClient<T> implements TransportClient<T> {
	constructor(private readonly opt: WsTransportClientOptions<T>) {}

	connect(): Promise<Connection<T>> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(this.opt.url);
			ws.binaryType = 'arraybuffer';

			ws.addEventListener('open', () => {
				const connection = new WsClientConnection<T>(ws, this.opt.codec, this.opt.logger);
				resolve(connection);
			});

			ws.addEventListener('error', err => {
				reject(err);
			});
		});
	}
}

export class WsClientConnection<T> implements Connection<T> {
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
		const data = this.codec.encode(message);
		this.ws.send(data);
	}

	subscribe(cb: Observer<T>, cx: Cancellation) {
		return this.subject.subscribe(cb, cx);
	}

	async close(): Promise<void> {
		this.ws.close();
		await this.closedSignal.promise;
	}

	private setupListeners(): void {
		this.ws.addEventListener('message', async event => {
			try {
				assert(event.data instanceof ArrayBuffer);
				const message = this.codec.decode(new Uint8Array(event.data));
				await this.subject.next(message);
			} catch (error) {
				this.logger.error('[ERR] error during ws message', error);
			}
		});

		this.ws.addEventListener('error', async error => {
			try {
				await this.subject.throw(new Error('ws.error: ' + error.toString()));
				this.closedSignal.resolve();
			} catch (error) {
				this.closedSignal.reject(error);
			}
		});

		this.ws.addEventListener('close', async () => {
			try {
				await this.subject.close();
				this.closedSignal.resolve();
			} catch (error) {
				this.closedSignal.reject(error);
			}
		});
	}
}
