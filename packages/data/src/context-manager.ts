import {Cancel, Context} from './context.js';
import {whenAll} from './utils.js';
import {Uuid} from './uuid.js';

export class ContextManager<T extends Uuid> {
    private readonly runningJobs = new Map<T, [Context, Cancel]>();
    private readonly cancelledJobs = new Set<T>();

    constructor(private readonly parentCtx: Context) {}

    start(id: T) {
        if (this.runningJobs.has(id)) {
            console.warn(`[WRN] job ${id} is already running`);
            const [ctx] = this.runningJobs.get(id)!;
            return ctx;
        } else if (this.cancelledJobs.has(id)) {
            console.warn(`[WRN] job ${id} is already finished`);
            return Context.cancelled();
        } else {
            const [ctx, cancel] = this.parentCtx.withCancel();
            this.runningJobs.set(id, [ctx, cancel]);
            return ctx;
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

    async finish(job: T) {
        if (this.runningJobs.has(job) || this.cancelledJobs.has(job)) {
            await this.runningJobs.get(job)?.[1]();
            this.runningJobs.delete(job);
            this.cancelledJobs.delete(job);
        } else {
            console.warn(`[WRN] unknown job: ${job}`);
        }
    }

    async finishAll() {
        const runningSnapshot = [...this.runningJobs.keys()];
        await whenAll(
            runningSnapshot.map(async job => {
                await this.finish(job);
            })
        );
    }
}
