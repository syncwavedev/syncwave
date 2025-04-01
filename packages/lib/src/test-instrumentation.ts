import {trace} from '@opentelemetry/api';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {
    AlwaysOnSampler,
    BasicTracerProvider,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

const tracerProvider = new BasicTracerProvider({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'test',
    }),
    sampler: new AlwaysOnSampler(),
});
trace.setGlobalTracerProvider(tracerProvider);
