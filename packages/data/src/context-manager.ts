import {Cancel, spawnContext} from './context.js';
import {logger} from './logger.js';
import {Nothing} from './utils.js';
import {Uuid} from './uuid.js';

export class ContextManager<T extends Uuid> {
    private readonly runningJobs = new Map<T, Cancel>();
    private readonly cancelledJobs = new Set<T>();

    constructor() {}

    start(id: T, fn: () => Nothing) {
        if (this.runningJobs.has(id)) {
            logger.warn(`job ${id} is already running`);
            return;
        } else if (this.cancelledJobs.has(id)) {
            logger.warn(`job ${id} is already finished`);
            return;
        } else {
            const cancel = spawnContext(fn);
            this.runningJobs.set(id, cancel);
            return cancel;
        }
    }

    cancel(id: T) {
        if (this.runningJobs.has(id)) {
            this.runningJobs.get(id)!();
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
            this.runningJobs.get(job)?.();
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
