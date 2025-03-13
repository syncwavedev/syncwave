import type {Tracer} from '@opentelemetry/api';
import {Resource} from '@opentelemetry/resources';
import {
    AlwaysOnSampler,
    BasicTracerProvider,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';
import {ENVIRONMENT} from './constants.js';
import {AppError} from './errors.js';

export type TracerName = 'agent' | 'coord' | 'hub';

class TracerManager {
    get(name: TracerName) {
        if (ENVIRONMENT === 'test') {
            return this.getTestTracer();
        }
        const tracer = (
            globalThis as unknown as {tracers: Record<string, Tracer>}
        ).tracers[name];
        if (!tracer) {
            throw new AppError(`tracer ${name} not found`);
        }

        return tracer;
    }

    private testTracer: Tracer | undefined = undefined;

    private getTestTracer() {
        if (!this.testTracer) {
            const provider = new BasicTracerProvider({
                resource: new Resource({
                    [ATTR_SERVICE_NAME]: 'test',
                }),
                sampler: new AlwaysOnSampler(),
            });
            provider.register();
            this.testTracer = provider.getTracer('test-tracer');
        }

        return this.testTracer;
    }
}

export const tracerManager = new TracerManager();
