import {diag, DiagConsoleLogger, DiagLogLevel} from '@opentelemetry/api';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {Resource} from '@opentelemetry/resources';
import {
	AlwaysOnSampler,
	BasicTracerProvider,
	SimpleSpanProcessor,
	Tracer,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

// if (globalThis.navigator) {
// 	const originalSendBeacon = globalThis.navigator.sendBeacon;
// 	globalThis.navigator.sendBeacon = function (
// 		url: string | URL,
// 		data?: BodyInit | null
// 	) {
// 		if (!(data instanceof Blob)) throw new Error('data must be a Blob');

// 		(globalThis as any).beaconData = data;

// 		(async () => {
// 			while (!originalSendBeacon.call(this, url, data)) {
// 				console.warn(
// 					`failed to send beacon ${url} size=${data.size}, retrying...`
// 				);
// 				await new Promise(r => setTimeout(r, 1000));
// 			}
// 		})();

// 		return true;
// 	};
// }

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

(globalThis as unknown as {tracers: Record<string, Tracer>}).tracers = {
	view: createTracer('view', true),
	part: createTracer('part'),
};
