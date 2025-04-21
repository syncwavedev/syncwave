import {Deferred} from './deferred.js';
import {AppError} from './errors.js';
import {log} from './logger.js';
import {assert, wait} from './utils.js';

export type BatchProcessorState =
    | {type: 'idle'}
    | {type: 'running'}
    | {type: 'closed'; cause: unknown};

export interface BatchProcessorOptions<T> {
    readonly state: BatchProcessorState;
    readonly process: (batch: T[]) => Promise<void>;
    readonly doneCallback?: () => void;
    readonly retries?: number;
    readonly enqueueDelay: number;
}

export class BatchProcessor<T> {
    private queue: T[] = [];
    private inProgress = false;

    state: BatchProcessorState;

    constructor(private readonly options: BatchProcessorOptions<T>) {
        this.state = options.state;
        assert(
            options.retries === undefined || options.retries >= 0,
            'retries must be >= 0'
        );
    }

    isSettled(): boolean {
        return this.queue.length === 0 && !this.inProgress;
    }

    waitSettled() {
        const result = new Deferred<void>();

        const interval = setInterval(() => {
            if (this.isSettled()) {
                result.resolve();
                clearInterval(interval);
            }
        }, 0).unref();

        return result.promise;
    }

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

        if (this.options.enqueueDelay > 0) {
            await new Promise(resolve =>
                setTimeout(resolve, this.options.enqueueDelay)
            );
        }

        await this.processQueue();
    }

    private async processQueue() {
        this.ensureOpen();

        if (
            this.state.type !== 'running' ||
            this.inProgress ||
            this.queue.length === 0
        ) {
            return;
        }

        try {
            this.inProgress = true;
            let attempt = 0;
            while (this.queue.length > 0) {
                const batch = this.queue.slice();
                this.queue = [];
                try {
                    await this.options.process(batch);
                    attempt = 0;
                } catch (error) {
                    if (attempt === this.options.retries) {
                        throw error;
                    }
                    this.queue.push(...batch);

                    log.error({
                        error,
                        msg: 'BatchProcessor: send error',
                    });
                    await wait({ms: 1000, onCancel: 'reject'});

                    attempt++;
                }
            }

            this.options.doneCallback?.();
        } finally {
            this.inProgress = false;
        }
    }

    close(reason: unknown): void {
        this.state = {type: 'closed', cause: reason};
        this.queue = [];
    }

    private ensureOpen() {
        if (this.state.type === 'closed') {
            throw new AppError('BatchProcessor: closed', {
                cause: this.state.cause,
            });
        }
    }
}
