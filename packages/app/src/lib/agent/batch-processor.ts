import {AppError, log, toError, wait} from 'syncwave-data';

export class BatchProcessor<T> {
	private queue: T[] = [];
	private inProgress = false;

	constructor(
		private state:
			| {type: 'idle'}
			| {type: 'running'}
			| {type: 'closed'; cause: unknown},
		private readonly process: (batch: T[]) => Promise<void>
	) {}

	async start() {
		this.ensureOpen();
		this.state = {type: 'running'};
		if (this.queue.length > 0) {
			await this.processQueue();
		}
	}

	async enqueue(item: T) {
		this.ensureOpen();
		this.queue.push(item);

		// small delay to batch async bursts
		// in particular it helps for tiptap initial focus with awareness
		await new Promise(resolve => setTimeout(resolve, 10));

		await this.processQueue();
	}

	private async processQueue() {
		this.ensureOpen();

		if (this.state.type !== 'running') {
			return;
		}

		if (!this.inProgress) {
			try {
				this.inProgress = true;
				while (this.queue.length > 0) {
					const batch = this.queue.slice();
					this.queue = [];
					try {
						await this.process(batch);
					} catch (error) {
						this.queue.push(...batch);

						log.error(toError(error), 'CrdtManager: send error');
						await wait({ms: 1000, onCancel: 'reject'});
					}
				}
			} finally {
				this.inProgress = false;
			}
		}
	}

	close(reason: unknown): void {
		this.state = {type: 'closed', cause: reason};
		this.queue = [];
	}

	private ensureOpen() {
		if (this.state.type === 'closed') {
			throw new AppError('CrdtManager: closed', {
				cause: this.state.cause,
			});
		}
	}
}
