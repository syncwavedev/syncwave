import '../instrumentation.js';

import 'dotenv/config';

import Router from '@koa/router';
import {AggregatorRegistry} from 'prom-client';
import {getReadableError, log} from 'syncwave';

const aggregatorRegistry = new AggregatorRegistry();

export function createMetricsRouter() {
    const router = new Router();

    router.get('/', async ctx => {
        try {
            const metrics = await aggregatorRegistry.clusterMetrics();
            ctx.set('Content-Type', aggregatorRegistry.contentType);
            ctx.body = metrics;
        } catch (error) {
            log.error({error, msg: 'failed to get metrics'});
            ctx.status = 500;
            ctx.body = getReadableError(error);
        }
    });

    return router;
}
