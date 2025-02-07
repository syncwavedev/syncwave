import {Cancel, context, TraceId} from './context.js';
import {logger} from './logger.js';

interface Job {
    readonly cancel: Cancel;
}

export class JobManager<T extends string> {
    private readonly runningJobs = new Map<T, Job>();
    private readonly cancelledJobs = new Set<T>();

    constructor() {}

    async start(
        id: T,
        traceId: TraceId,
        fn: () => Promise<void>
    ): Promise<void> {
        if (this.runningJobs.has(id)) {
            throw new Error(`job ${id} is already running`);
        } else if (this.cancelledJobs.has(id)) {
            throw new Error(`job ${id} is already finished`);
        } else {
            const [ctx, cancel] = context().createBackground({traceId});
            this.runningJobs.set(id, {cancel});
            await ctx.run(fn);
        }
    }

    cancel(id: T) {
        if (this.runningJobs.has(id)) {
            this.runningJobs.get(id)!.cancel();
            this.runningJobs.delete(id);
            this.cancelledJobs.add(id);
        } else if (this.cancelledJobs.has(id)) {
            logger.warn(`job ${id} is already cancelled`);
        } else {
            logger.warn(`unknown job: ${id}`);
        }
    }

    finish(job: T) {
        if (this.runningJobs.has(job) || this.cancelledJobs.has(job)) {
            const runningJob = this.runningJobs.get(job);
            if (runningJob) {
                runningJob.cancel();
            }
            this.runningJobs.delete(job);
            this.cancelledJobs.delete(job);
        } else {
            logger.warn(`unknown job: ${job}`);
        }
    }

    finishAll() {
        const runningSnapshot = [...this.runningJobs.keys()];
        runningSnapshot.forEach(job => this.finish(job));
    }
}
