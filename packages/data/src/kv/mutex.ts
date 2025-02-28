import {Deferred} from '../deferred.js';
import {AppError} from '../errors.js';

export class Mutex {
    private locked = false;
    private queue: Array<() => void> = [];

    async run<T>(fn: () => Promise<T>): Promise<T> {
        try {
            await this.lock();
            return await fn();
        } finally {
            this.unlock();
        }
    }

    // prefer run
    async lock(): Promise<void> {
        if (this.locked) {
            const signal = new Deferred<void>();
            this.queue.push(() => {
                this.locked = true;
                signal.resolve();
            });
            await signal.promise;
        } else {
            this.locked = true;
        }
    }

    // prefer run
    unlock(): void {
        if (!this.locked) {
            throw new AppError('Mutex is not locked');
        }

        this.locked = false;

        this.queue.shift()?.();
    }
}
