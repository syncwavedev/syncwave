import {Cancel, Cx} from './context.js';
import {logger} from './logger.js';
import {Uuid} from './uuid.js';

export class ContextManager<T extends Uuid> {
    private readonly runningJobs = new Map<T, [Cx, Cancel]>();
    private readonly cancelledJobs = new Set<T>();

    constructor(private readonly parentCx: Cx) {}

    start(cx: Cx, id: T) {
        if (this.runningJobs.has(id)) {
            logger.warn(cx, `job ${id} is already running`);
            const [jobCx] = this.runningJobs.get(id)!;
            return jobCx;
        } else if (this.cancelledJobs.has(id)) {
            logger.warn(cx, `job ${id} is already finished`);
            return Cx.cancelled();
        } else {
            const [cx, cancel] = this.parentCx.withCancel();
            this.runningJobs.set(id, [cx, cancel]);
            return cx;
        }
    }

    cancel(id: T) {
        if (this.runningJobs.has(id)) {
            this.runningJobs.get(id)![1]();
            this.runningJobs.delete(id);
            this.cancelledJobs.add(id);
        } else if (this.cancelledJobs.has(id)) {
            logger.warn(Cx.todo(), `job ${id} is already cancelled`);
        } else {
            logger.warn(Cx.todo(), `unknown job: ${id}`);
        }
    }

    finish(job: T) {
        if (this.runningJobs.has(job) || this.cancelledJobs.has(job)) {
            this.runningJobs.get(job)?.[1]();
            this.runningJobs.delete(job);
            this.cancelledJobs.delete(job);
        } else {
            logger.warn(Cx.todo(), `unknown job: ${job}`);
        }
    }

    finishAll() {
        const runningSnapshot = [...this.runningJobs.keys()];
        runningSnapshot.forEach(job => this.finish(job));
    }
}
