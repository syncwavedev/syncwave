export class JobTracker<T> {
    private readonly runningJobs = new Set<T>();
    private readonly cancelledJobs = new Set<T>();

    start(job: T) {
        if (this.runningJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already running`);
        } else if (this.cancelledJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already finished`);
        } else {
            this.runningJobs.add(job);
        }
    }

    cancel(job: T) {
        if (this.runningJobs.has(job)) {
            this.runningJobs.delete(job);
            this.cancelledJobs.add(job);
        } else if (this.cancelledJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already cancelled`);
        } else {
            console.warn(`[WRN] unknown job: ${job}`);
        }
    }

    finish(job: T) {
        if (this.runningJobs.has(job) || this.cancelledJobs.has(job)) {
            this.runningJobs.delete(job);
            this.cancelledJobs.delete(job);
        } else {
            console.warn(`[WRN] unknown job: ${job}`);
        }
    }

    cancelAll() {
        this.runningJobs.forEach(job => this.cancelledJobs.add(job));
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
