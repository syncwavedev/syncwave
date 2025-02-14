import {diag, DiagConsoleLogger, DiagLogLevel} from '@opentelemetry/api';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {Resource} from '@opentelemetry/resources';
import {
    AlwaysOnSampler,
    BasicTracerProvider,
    SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const exporter = new SimpleSpanProcessor(
    new OTLPTraceExporter({
        url: 'http://127.0.0.1:4318/v1/traces',
    })
);

function createTracer(name: string, register = false) {
    const provider = new BasicTracerProvider({
        resource: new Resource({
            [ATTR_SERVICE_NAME]: name,
        }),
        spanProcessors: [exporter],
        sampler: new AlwaysOnSampler(),
    });
    if (register) {
        provider.register();
    }

    return provider.getTracer('syncwave');
}

(globalThis as any).tracers = {
    coord: createTracer('coord', true),
    hub: createTracer('hub'),
    part: createTracer('part'),
    view: createTracer('view'),
};
