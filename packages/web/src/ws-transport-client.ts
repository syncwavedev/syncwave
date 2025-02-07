import WebSocket from 'isomorphic-ws';
import {
	assert,
	log,
	Subject,
	TransportServerUnreachableError,
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
		log.trace('ws connect');

		return new Promise((resolve, reject) => {
			const ws = new WebSocket(this.opt.url);
			ws.binaryType = 'arraybuffer';

			ws.addEventListener('open', () => {
				log.trace('ws connect: open');
				const connection = new WsClientConnection<T>(ws, this.opt.codec);
				resolve(connection);
			});

			ws.addEventListener('error', err => {
				log.trace('ws connect: error', err.message);
				const codes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE'];
				if (codes.some(code => err.message.includes(code))) {
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
				log.debug('ws got', msg);
			},
			throw: async err => {
				log.error('ws err', err);
			},
			close: () => {
				log.debug('ws closed');
			},
		});
	}

	send(message: T): Promise<void> {
		log.trace('ws client: send', message);
		const data = this.codec.encode(message);
		this.ws.send(data);

		return Promise.resolve();
	}

	subscribe(cb: Observer<T>): Unsubscribe {
		log.trace('ws subscribe');
		return this.subject.subscribe(cb);
	}

	close(): void {
		log.trace('ws client: close');
		this.ws.close();
	}

	private setupListeners(): void {
		this.ws.addEventListener('message', async event => {
			try {
				assert(event.data instanceof ArrayBuffer);
				const message = this.codec.decode(new Uint8Array(event.data));
				await this.subject.next(message);
			} catch (error) {
				log.error('error during ws message', {error, open: this.subject.open});
			}
		});

		this.ws.addEventListener('error', async error => {
			log.error('ws client: error event', error);
			try {
				await this.subject.throw(new Error('ws.error: ' + error.toString()));
			} catch (error) {
				log.error('error during ws error', error);
			}
		});

		this.ws.addEventListener('close', () => {
			log.trace('ws client: close event');
			this.subject.close();
		});
	}
}
