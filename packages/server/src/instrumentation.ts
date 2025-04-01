import {diag, DiagConsoleLogger, DiagLogLevel} from '@opentelemetry/api';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {Resource} from '@opentelemetry/resources';
import {
    AlwaysOnSampler,
    BasicTracerProvider,
    BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

import {logs} from '@opentelemetry/api-logs';
import {
    LoggerProvider,
    SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// traces

const spanExporter = new BatchSpanProcessor(
    new OTLPTraceExporter({
        url: 'https://otel.bridgex.dev/v1/traces',
    })
);

const tracerProvider = new BasicTracerProvider({
    resource: new Resource({
        [ATTR_SERVICE_NAME]: 'server',
    }),
    spanProcessors: [spanExporter],
    sampler: new AlwaysOnSampler(),
});
tracerProvider.register();

// logs

const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor({
        export: (logs, cb) => {
            for (const log of logs) {
                console.log(JSON.stringify(log.body));
            }

            cb({code: 0});
        },
        shutdown: () => Promise.resolve(),
    })
);

logs.setGlobalLoggerProvider(loggerProvider);
