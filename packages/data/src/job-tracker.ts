import {Cancellation, CancellationSource} from './utils.js';

export class JobTracker<T> {
    private readonly runningJobs = new Map<T, CancellationSource>();
    private readonly cancelledJobs = new Set<T>();

    start(job: T) {
        if (this.runningJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already running`);
        } else if (this.cancelledJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already finished`);
        } else {
            this.runningJobs.set(job, new CancellationSource());
        }
    }

    cancel(job: T) {
        if (this.runningJobs.has(job)) {
            this.runningJobs.get(job)!.cancel();
            this.runningJobs.delete(job);
            this.cancelledJobs.add(job);
        } else if (this.cancelledJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already cancelled`);
        } else {
            console.warn(`[WRN] unknown job: ${job}`);
        }
    }

    cancellation(job: T): Cancellation {
        const cxs = this.runningJobs.get(job);
        if (cxs) {
            return cxs.cancellation;
        } else if (this.cancelledJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already cancelled`);
            return Cancellation.cancelled;
        } else {
            throw new Error(`cancellation: unknown job: ${job}`);
        }
    }

    finish(job: T) {
        if (this.runningJobs.has(job) || this.cancelledJobs.has(job)) {
            this.runningJobs.get(job)?.cancel();
            this.runningJobs.delete(job);
            this.cancelledJobs.delete(job);
        } else {
            console.warn(`[WRN] unknown job: ${job}`);
        }
    }

    cancelAll() {
        this.runningJobs.forEach((cxs, job) => {
            this.cancelledJobs.add(job);
            cxs.cancel();
        });
        this.runningJobs.clear();
    }

    isRunning(job: T) {
        if (this.runningJobs.has(job)) {
            return true;
        } else if (this.cancelledJobs.has(job)) {
            return false;
        } else {
            console.warn(`[WRN] unknown job: ${job}`);
            return false;
        }
    }
}
