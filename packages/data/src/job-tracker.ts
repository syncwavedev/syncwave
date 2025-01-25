export class JobTracker<T> {
    private readonly runningJobs = new Set<T>();
    private readonly cancelledJobs = new Set<T>();

    start(job: T) {
        if (this.runningJobs.has(job)) {
            throw new Error(`job ${job} is already running`);
        }
        if (this.cancelledJobs.has(job)) {
            throw new Error(`job ${job} is already finished`);
        }
        this.runningJobs.add(job);
    }

    cancel(job: T) {
        if (!this.runningJobs.has(job)) {
            throw new Error(`job ${job} is not running`);
        }
        if (this.cancelledJobs.has(job)) {
            throw new Error(`job ${job} is already finished`);
        }
        this.runningJobs.delete(job);
        this.cancelledJobs.add(job);
    }

    finish(job: T) {
        if (!this.runningJobs.has(job) && !this.cancelledJobs.has(job)) {
            throw new Error(`unknown job: ${job}`);
        }
        this.runningJobs.delete(job);
        this.cancelledJobs.delete(job);
    }

    cancelAll() {
        this.runningJobs.forEach(job => this.cancelledJobs.add(job));
        this.runningJobs.clear();
    }

    isRunning(job: T) {
        if (!this.runningJobs.has(job) && !this.cancelledJobs.has(job)) {
            throw new Error(`unknown job: ${job}`);
        }
        return this.runningJobs.has(job);
    }
}
