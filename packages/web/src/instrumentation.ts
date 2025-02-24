import {diag, DiagConsoleLogger, DiagLogLevel} from '@opentelemetry/api';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {Resource} from '@opentelemetry/resources';
import {
	AlwaysOnSampler,
	BasicTracerProvider,
	BatchSpanProcessor,
	Tracer,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
const exporter = new BatchSpanProcessor(
	new OTLPTraceExporter({
		url: 'https://otel.bridgex.dev/v1/traces',
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

(globalThis as unknown as {tracers: Record<string, Tracer>}).tracers = {
	view: createTracer('view', true),
	part: createTracer('part'),
};
