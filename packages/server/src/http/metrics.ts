import '../instrumentation.js';

import 'dotenv/config';

import Router from '@koa/router';
import {AggregatorRegistry} from 'prom-client';
import {getReadableError, log, toError} from 'syncwave';

const aggregatorRegistry = new AggregatorRegistry();

export function createMetricsRouter() {
    const router = new Router();

    router.get('/', async ctx => {
        try {
            const metrics = await aggregatorRegistry.clusterMetrics();
            ctx.set('Content-Type', aggregatorRegistry.contentType);
            ctx.body = metrics;
        } catch (ex) {
            log.error(toError(ex), 'failed to get metrics');
            ctx.status = 500;
            ctx.body = getReadableError(ex);
        }
    });

    return router;
}
