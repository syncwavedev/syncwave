import {Cancel, Context} from './context.js';
import {AppError} from './errors.js';
import {log} from './logger.js';

interface Job {
    readonly ctx: Context;
    readonly end: Cancel;
}

export class JobManager<T extends string> {
    private readonly runningJobs = new Map<T, Job>();
    private readonly cancelledJobs = new Map<T, Job>();

    constructor() {}

    async start(
        id: T,
        ctx: Context,
        end: Cancel,
        fn: () => Promise<void>
    ): Promise<void> {
        if (this.runningJobs.has(id)) {
            throw new AppError(`job ${id} is already running`);
        } else if (this.cancelledJobs.has(id)) {
            throw new AppError(`job ${id} is already finished`);
        } else {
            this.runningJobs.set(id, {ctx, end});
            await ctx.run(fn);
        }
    }

    isCancelled(id: T) {
        return this.cancelledJobs.has(id);
    }

    cancel(id: T, reason: unknown) {
        if (this.runningJobs.has(id)) {
            const job = this.runningJobs.get(id)!;
            this.runningJobs.get(id)!.end(reason);
            this.runningJobs.delete(id);
            this.cancelledJobs.set(id, job);
        } else if (this.cancelledJobs.has(id)) {
            const job = this.cancelledJobs.get(id)!;
            log.warn(
                `job ${id} is already cancelled, job.traceId = ${job.ctx.traceId}`
            );
        } else {
            log.warn(`JobManager.cancel: unknown job: ${id}`);
        }
    }

    finish(job: T, reason: unknown) {
        if (this.runningJobs.has(job) || this.cancelledJobs.has(job)) {
            const runningJob = this.runningJobs.get(job);
            if (runningJob) {
                runningJob.end(reason);
            }
            this.runningJobs.delete(job);
            this.cancelledJobs.delete(job);
        } else {
            log.warn(`JobManager.finish: unknown job: ${job}`);
        }
    }

    finishAll(reason: unknown) {
        const runningSnapshot = [...this.runningJobs.keys()];
        runningSnapshot.forEach(job => this.finish(job, reason));
    }
}
