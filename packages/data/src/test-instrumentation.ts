import {Resource} from '@opentelemetry/resources';
import {
    AlwaysOnSampler,
    BasicTracerProvider,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

const provider = new BasicTracerProvider({
    resource: new Resource({
        [ATTR_SERVICE_NAME]: 'test',
    }),
    sampler: new AlwaysOnSampler(),
});
provider.register();
