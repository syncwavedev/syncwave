import {createHook} from 'node:async_hooks';
import {context, log, type TraceId} from 'syncwave-data';

const THRESHOLD_NS = 1e8; // 100ms

const cache = new Map<
    number,
    {type: string; traceId: TraceId; spanId: string; start?: [number, number]}
>();

function init(asyncId: number, type: string) {
    cache.set(asyncId, {
        type,
        traceId: context().traceId,
        spanId: context().spanId,
    });
}

function destroy(asyncId: number) {
    cache.delete(asyncId);
}

function before(asyncId: number) {
    const cached = cache.get(asyncId);

    if (!cached) {
        return;
    }

    cache.set(asyncId, {
        ...cached,
        start: process.hrtime(),
    });
}

function after(asyncId: number) {
    const cached = cache.get(asyncId);

    if (!cached) {
        return;
    }

    cache.delete(asyncId);

    if (!cached.start) {
        return;
    }

    const diff = process.hrtime(cached.start);
    const diffNs = diff[0] * 1e9 + diff[1];
    if (diffNs > THRESHOLD_NS) {
        const time = diffNs / 1e6; // in ms

        log.warn(
            `Event loop blocked for ${time.toFixed(2)}ms, info: ${JSON.stringify(cached)}`
        );
    }
}

export const eventLoopMonitor = (() => {
    const hook = createHook({init, before, after, destroy});

    return {
        enable: () => {
            log.info('Initializing event loop monitor');

            hook.enable();
        },
        disable: () => {
            log.info('Disabling event loop monitor');

            hook.disable();
        },
    };
})();
