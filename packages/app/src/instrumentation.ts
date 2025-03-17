import {diag, DiagConsoleLogger, DiagLogLevel} from '@opentelemetry/api';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {Resource} from '@opentelemetry/resources';
import {
	AlwaysOnSampler,
	BasicTracerProvider,
	BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
const exporter = new BatchSpanProcessor(
	new OTLPTraceExporter({
		url: 'https://otel.bridgex.dev/v1/traces',
	})
);

const provider = new BasicTracerProvider({
	resource: new Resource({
		[ATTR_SERVICE_NAME]: 'client',
	}),
	spanProcessors: [exporter],
	sampler: new AlwaysOnSampler(),
});
provider.register();
