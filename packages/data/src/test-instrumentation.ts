import {Resource} from '@opentelemetry/resources';
import {
    AlwaysOnSampler,
    BasicTracerProvider,
    Tracer,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

function createTracer(name: string, register = false) {
    const provider = new BasicTracerProvider({
        resource: new Resource({
            [ATTR_SERVICE_NAME]: name,
        }),
        sampler: new AlwaysOnSampler(),
    });
    if (register) {
        provider.register();
    }

    return provider.getTracer('syncwave');
}

(globalThis as unknown as {tracers: Record<string, Tracer>}).tracers = {
    view: createTracer('view', true),
    part: createTracer('part'),
    coord: createTracer('coord'),
    hub: createTracer('hub'),
};
