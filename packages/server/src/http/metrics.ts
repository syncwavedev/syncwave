import '../instrumentation.js';

import 'dotenv/config';

import Router from '@koa/router';
import {AggregatorRegistry, register} from 'prom-client';
import {getReadableError, log} from 'syncwave';

const aggregatorRegistry = new AggregatorRegistry();

export function createMetricsRouter(mode: 'cluster' | 'standalone') {
    const router = new Router();

    router.get('/', async ctx => {
        try {
            if (mode === 'standalone') {
                const metrics = await register.metrics();
                ctx.set('Content-Type', register.contentType);
                ctx.body = metrics;
            } else {
                const metrics = await aggregatorRegistry.clusterMetrics();
                ctx.set('Content-Type', aggregatorRegistry.contentType);
                ctx.body = metrics;
            }
        } catch (error) {
            log.error({error, msg: 'failed to get metrics'});
            ctx.status = 500;
            ctx.body = getReadableError(error);
        }
    });

    return router;
}
