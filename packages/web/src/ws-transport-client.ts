import WebSocket from 'isomorphic-ws';
import {
	assert,
	logger,
	Subject,
	type Codec,
	type Connection,
	type Observer,
	type TransportClient,
	type Unsubscribe,
} from 'syncwave-data';

export interface WsTransportClientOptions<T> {
	readonly url: string;
	readonly codec: Codec<T>;
}

export class WsTransportClient<T> implements TransportClient<T> {
	constructor(private readonly opt: WsTransportClientOptions<T>) {}

	connect(): Promise<Connection<T>> {
		logger.trace('ws connect');

		return new Promise((resolve, reject) => {
			const ws = new WebSocket(this.opt.url);
			ws.binaryType = 'arraybuffer';

			ws.addEventListener('open', () => {
				logger.trace('ws connect: open');
				const connection = new WsClientConnection<T>(ws, this.opt.codec);
				resolve(connection);
			});

			ws.addEventListener('error', err => {
				logger.error('ws connect: error', err);
				reject(err);
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
				logger.debug('ws got', msg);
			},
			throw: async err => {
				logger.error('ws err', err);
			},
			close: () => {
				logger.debug('ws closed');
			},
		});
	}

	send(message: T): Promise<void> {
		logger.trace('ws send message', message);
		const data = this.codec.encode(message);
		this.ws.send(data);

		return Promise.resolve();
	}

	subscribe(cb: Observer<T>): Unsubscribe {
		logger.trace('ws subscribe');
		return this.subject.subscribe(cb);
	}

	close(): void {
		this.ws.close();
	}

	private setupListeners(): void {
		this.ws.addEventListener('message', async event => {
			try {
				assert(event.data instanceof ArrayBuffer);
				const message = this.codec.decode(new Uint8Array(event.data));
				await this.subject.next(message);
			} catch (error) {
				logger.error('error during ws message', error);
			}
		});

		this.ws.addEventListener('error', async error => {
			try {
				await this.subject.throw(new Error('ws.error: ' + error.toString()));
			} catch (error) {
				logger.error('error during ws error', error);
			}
		});

		this.ws.addEventListener('close', () => {
			this.subject.close();
		});
	}
}
