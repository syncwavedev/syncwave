import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {context, createTraceId, TraceId} from './context.js';
import {JobManager} from './job-manager.js';
import {logger} from './logger.js';
import {whenAll} from './utils.js';

describe('JobManager', () => {
    let manager: JobManager<string>;
    let traceId: TraceId;

    beforeEach(() => {
        logger.setLogLevel('none');
        manager = new JobManager();
        traceId = createTraceId();
    });

    afterEach(() => {
        logger.setLogLevel('info');
    });

    it('should start a job successfully', async () => {
        let executed = false;
        await manager.start('job1', traceId, async () => {
            executed = true;
        });
        expect(executed).toBe(true);
    });

    it('should throw an error if the same job is started twice', async () => {
        await manager.start('job1', traceId, async () => {});
        await expect(
            manager.start('job1', traceId, async () => {})
        ).rejects.toThrow('job job1 is already running');
    });

    it('should throw an error if a cancelled job is restarted', async () => {
        await manager.start('job1', traceId, async () => {});
        manager.cancel('job1');
        await expect(
            manager.start('job1', traceId, async () => {})
        ).rejects.toThrow('job job1 is already finished');
    });

    it('should cancel a running job', async () => {
        await manager.start('job1', traceId, async () => {
            return new Promise(resolve => setTimeout(resolve, 100));
        });
        manager.cancel('job1');
        expect(manager['cancelledJobs'].has('job1')).toBe(true);
    });

    it('should log a warning when canceling a non-existent job', () => {
        manager.cancel('nonexistent'); // Should not throw but log a warning
    });

    it('should log a warning when canceling an already cancelled job', async () => {
        await manager.start('job1', traceId, async () => {});
        manager.cancel('job1');
        manager.cancel('job1'); // Second cancel should log a warning
    });

    it('should finish a job', async () => {
        await manager.start('job1', traceId, async () => {});
        manager.finish('job1');
        expect(manager['runningJobs'].has('job1')).toBe(false);
    });

    it('should not allow finishing a non-existent job', () => {
        manager.finish('nonexistent'); // Should log a warning
    });

    it('should finish all running jobs', async () => {
        await manager.start('job1', traceId, async () => {});
        await manager.start('job2', traceId, async () => {});
        manager.finishAll();
        expect(manager['runningJobs'].size).toBe(0);
    });

    it('should maintain the correct traceId inside and outside the job', async () => {
        let jobTraceId;
        await manager.start('job1', traceId, async () => {
            jobTraceId = context().traceId;
        });
        expect(jobTraceId).toBe(traceId);
    });

    it('should maintain the correct context in parallel jobs', async () => {
        const traceIds: string[] = [];
        const traceId1 = createTraceId();
        const traceId2 = createTraceId();
        await whenAll([
            manager.start('job1', traceId1, async () => {
                traceIds.push(context().traceId + '_first');
                await new Promise(resolve => setTimeout(resolve, 50));
                traceIds.push(context().traceId + '_first');
            }),
            manager.start('job2', traceId2, async () => {
                traceIds.push(context().traceId + '_second');
                await new Promise(resolve => setTimeout(resolve, 50));
                traceIds.push(context().traceId + '_second');
            }),
        ]);
        expect(new Set(traceIds).size).toBe(2);
        expect(traceIds).includes(traceId1 + '_first');
        expect(traceIds).includes(traceId2 + '_second');
    });

    it('should maintain context after awaiting a delay', async () => {
        let initialTraceId: TraceId | undefined = undefined;
        let postWaitTraceId: TraceId | undefined = undefined;
        await manager.start('job1', traceId, async () => {
            initialTraceId = context().traceId;
            await new Promise(resolve => setTimeout(resolve, 50));
            postWaitTraceId = context().traceId;
        });
        expect(initialTraceId).toBe(traceId);
        expect(postWaitTraceId).toBe(traceId);
    });
});
