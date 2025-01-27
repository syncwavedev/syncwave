import {Cancel, Context} from './context.js';
import {whenAll} from './utils.js';
import {Uuid} from './uuid.js';

export class ContextManager<T extends Uuid> {
    private readonly runningJobs = new Map<T, [Context, Cancel]>();
    private readonly cancelledJobs = new Set<T>();

    constructor(private readonly parentCtx: Context) {}

    start(job: T) {
        if (this.runningJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already running`);
        } else if (this.cancelledJobs.has(job)) {
            console.warn(`[WRN] job ${job} is already finished`);
        } else {
            this.runningJobs.set(job, this.parentCtx.withCancel());
        }
    }

    async cancel(id: T) {
        if (this.runningJobs.has(id)) {
            await this.runningJobs.get(id)![1]();
            this.runningJobs.delete(id);
            this.cancelledJobs.add(id);
        } else if (this.cancelledJobs.has(id)) {
            console.warn(`[WRN] job ${id} is already cancelled`);
        } else {
            console.warn(`[WRN] unknown job: ${id}`);
        }
    }

    context(id: T): Context {
        if (this.runningJobs.has(id)) {
            const [ctx] = this.runningJobs.get(id)!;
            return ctx;
        } else if (this.cancelledJobs.has(id)) {
            console.warn(`[WRN] job ${id} is already cancelled`);
            return Context.cancelled;
        } else {
            throw new Error(`cancellation: unknown job: ${id}`);
        }
    }

    async finish(job: T) {
        if (this.runningJobs.has(job) || this.cancelledJobs.has(job)) {
            await this.runningJobs.get(job)?.[1]();
            this.runningJobs.delete(job);
            this.cancelledJobs.delete(job);
        } else {
            console.warn(`[WRN] unknown job: ${job}`);
        }
    }

    async cancelAll() {
        const runningSnapshot = [...this.runningJobs.entries()];
        this.runningJobs.clear();
        await whenAll(
            runningSnapshot.map(async ([job, [, cancel]]) => {
                this.cancelledJobs.add(job);
                await cancel();
            })
        );
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
