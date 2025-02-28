import {Deferred} from '../deferred.js';
import {AppError} from '../errors.js';

export class RwLock {
    private readQueue: Array<() => void> = [];
    private writeQueue: Array<() => void> = [];
    private readCount = 0;
    private writing = false;

    async runWrite<R>(fn: () => Promise<R>): Promise<R> {
        try {
            await this.writeLock();
            return await fn();
        } finally {
            this.unlockWrite();
        }
    }

    // prefer runWrite
    async writeLock(): Promise<void> {
        if (this.readCount > 0 || this.writing) {
            const signal = new Deferred<void>();
            this.writeQueue.push(() => {
                this.writing = true;
                signal.resolve();
            });
            await signal.promise;
        } else {
            this.writing = true;
        }
    }

    // prefer runWrite
    unlockWrite(): void {
        if (!this.writing) {
            throw new AppError('Write lock is not held');
        }

        this.writing = false;

        // first start all readers to facilitate read queue progress
        if (this.readQueue.length > 0) {
            this.readQueue.forEach(fn => fn());
            this.readQueue = [];
        } else {
            this.writeQueue.shift()?.();
        }
    }

    async runRead<R>(fn: () => Promise<R>): Promise<R> {
        try {
            await this.readLock();
            return await fn();
        } finally {
            this.unlockRead();
        }
    }

    // prefer runRead
    async readLock(): Promise<void> {
        if (this.writeQueue.length > 0 || this.writing) {
            const signal = new Deferred<void>();
            this.readQueue.push(() => {
                this.readCount++;
                signal.resolve();
            });
            await signal.promise;
        } else {
            this.readCount++;
        }
    }

    // prefer runRead
    unlockRead(): void {
        if (this.readCount === 0) {
            throw new AppError('Read lock is not held');
        }

        this.readCount--;

        // first start a writer to facilitate write queue progress
        if (this.writeQueue.length > 0) {
            if (this.readCount === 0) {
                this.writeQueue.shift()?.();
            }
        } else {
            this.readQueue.forEach(fn => fn());
            this.readQueue = [];
        }
    }
}
