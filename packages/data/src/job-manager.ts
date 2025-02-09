import {Cancel, context, TraceId} from './context.js';
import {AppError} from './errors.js';
import {log} from './logger.js';

interface Job {
    readonly traceId: TraceId;
    readonly cancel: Cancel;
}

export class JobManager<T extends string> {
    private readonly runningJobs = new Map<T, Job>();
    private readonly cancelledJobs = new Map<T, Job>();

    constructor() {}

    async start(
        id: T,
        traceId: TraceId,
        fn: () => Promise<void>
    ): Promise<void> {
        if (this.runningJobs.has(id)) {
            throw new AppError(`job ${id} is already running`);
        } else if (this.cancelledJobs.has(id)) {
            throw new AppError(`job ${id} is already finished`);
        } else {
            const [ctx, cancel] = context().createBackground({traceId});
            this.runningJobs.set(id, {traceId, cancel});
            await ctx.run(fn);
        }
    }

    isCancelled(id: T) {
        return this.cancelledJobs.has(id);
    }

    cancel(id: T) {
        if (this.runningJobs.has(id)) {
            const job = this.runningJobs.get(id)!;
            this.runningJobs.get(id)!.cancel();
            this.runningJobs.delete(id);
            this.cancelledJobs.set(id, job);
        } else if (this.cancelledJobs.has(id)) {
            const job = this.cancelledJobs.get(id)!;
            log.warn(
                `job ${id} is already cancelled, job.traceId = ${job.traceId}`
            );
        } else {
            log.warn(`unknown job: ${id}`);
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
            log.warn(`unknown job: ${job}`);
        }
    }

    finishAll() {
        const runningSnapshot = [...this.runningJobs.keys()];
        runningSnapshot.forEach(job => this.finish(job));
    }
}
