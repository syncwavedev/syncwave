import type {Tracer} from '@opentelemetry/api';
import {AppError} from './errors.js';

export type TracerName = 'view' | 'part' | 'coord' | 'hub';

class TracerManager {
    get(name: TracerName) {
        const tracer = (
            globalThis as unknown as {tracers: Record<string, Tracer>}
        ).tracers[name];
        if (!tracer) {
            throw new AppError(`tracer ${name} not found`);
        }

        return tracer;
    }
}

export const tracerManager = new TracerManager();
