import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {type Cancel, Context, context, type TraceId} from './context.js';
import {JobManager} from './job-manager.js';
import {log} from './logger.js';
import {whenAll} from './utils.js';

describe('JobManager', () => {
    let manager: JobManager<string>;
    let ctx: Context;
    let cancelCtx: Cancel;

    beforeEach(() => {
        log.setLogLevel('silent');
        manager = new JobManager();
        [ctx, cancelCtx] = Context._root.createDetached({
            span: 'test context',
        });
    });

    afterEach(() => {
        log.setLogLevel('info');
    });

    it('should start a job successfully', async () => {
        let executed = false;
        await manager.start('job1', ctx, cancelCtx, async () => {
            executed = true;
        });
        expect(executed).toBe(true);
    });

    it('should throw an error if the same job is started twice', async () => {
        await manager.start('job1', ctx, cancelCtx, async () => {});
        await expect(
            manager.start('job1', ctx, cancelCtx, async () => {})
        ).rejects.toThrow('job job1 is already running');
    });

    it('should throw an error if a cancelled job is restarted', async () => {
        await manager.start('job1', ctx, cancelCtx, async () => {});
        manager.cancel('job1', 'test cancel');
        await expect(
            manager.start('job1', ctx, cancelCtx, async () => {})
        ).rejects.toThrow('job job1 is already finished');
    });

    it('should cancel a running job', async () => {
        await manager.start('job1', ctx, cancelCtx, async () => {
            return new Promise(resolve => setTimeout(resolve, 100));
        });
        manager.cancel('job1', 'test cancel');
        expect(manager['cancelledJobs'].has('job1')).toBe(true);
    });

    it('should log a warning when canceling a non-existent job', () => {
        manager.cancel('nonexistent', 'test cancel'); // Should not throw but log a warning
    });

    it('should log a warning when canceling an already cancelled job', async () => {
        await manager.start('job1', ctx, cancelCtx, async () => {});
        manager.cancel('job1', 'test cancel 1');
        manager.cancel('job1', 'test cancel 2'); // Second cancel should log a warning
    });

    it('should finish a job', async () => {
        await manager.start('job1', ctx, cancelCtx, async () => {});
        manager.finish('job1', 'test cancel');
        expect(manager['runningJobs'].has('job1')).toBe(false);
    });

    it('should not allow finishing a non-existent job', () => {
        manager.finish('nonexistent', 'test cancel'); // Should log a warning
    });

    it('should finish all running jobs', async () => {
        await manager.start('job1', ctx, cancelCtx, async () => {});
        await manager.start('job2', ctx, cancelCtx, async () => {});
        manager.finishAll('test finish all');
        expect(manager['runningJobs'].size).toBe(0);
    });

    it('should maintain the correct traceId inside and outside the job', async () => {
        let jobTraceId;
        await manager.start('job1', ctx, cancelCtx, async () => {
            jobTraceId = context().traceId;
        });
        expect(jobTraceId).toBe(ctx.traceId);
    });

    it('should maintain the correct context in parallel jobs', async () => {
        const traceIds: string[] = [];
        const [ctx1, cancelCtx1] = ctx.createChild({span: 'job1'});
        const [ctx2, cancelCtx2] = ctx.createChild({span: 'job2'});
        await whenAll([
            manager.start('job1', ctx1, cancelCtx1, async () => {
                traceIds.push(context().traceId + '_first');
                await new Promise(resolve => setTimeout(resolve, 50));
                traceIds.push(context().traceId + '_first');
            }),
            manager.start('job2', ctx2, cancelCtx2, async () => {
                traceIds.push(context().traceId + '_second');
                await new Promise(resolve => setTimeout(resolve, 50));
                traceIds.push(context().traceId + '_second');
            }),
        ]);
        expect(new Set(traceIds).size).toBe(2);
        expect(traceIds).includes(ctx1.traceId + '_first');
        expect(traceIds).includes(ctx2.traceId + '_second');
    });

    it('should maintain context after awaiting a delay', async () => {
        let initialTraceId: TraceId | undefined = undefined;
        let postWaitTraceId: TraceId | undefined = undefined;
        await manager.start('job1', ctx, cancelCtx, async () => {
            initialTraceId = context().traceId;
            await new Promise(resolve => setTimeout(resolve, 50));
            postWaitTraceId = context().traceId;
        });
        expect(initialTraceId).toBe(ctx.traceId);
        expect(postWaitTraceId).toBe(ctx.traceId);
    });
});
