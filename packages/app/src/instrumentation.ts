import {diag, DiagConsoleLogger, DiagLogLevel, trace} from '@opentelemetry/api';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {
    AlwaysOnSampler,
    BasicTracerProvider,
    BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import {ATTR_SERVICE_NAME} from '@opentelemetry/semantic-conventions';

import {logs, SeverityNumber} from '@opentelemetry/api-logs';
import {OTLPLogExporter} from '@opentelemetry/exporter-logs-otlp-http';
import {
    BatchLogRecordProcessor,
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
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'client',
    }),
    spanProcessors: [spanExporter],
    sampler: new AlwaysOnSampler(),
});
trace.setGlobalTracerProvider(tracerProvider);

// logs

const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'client',
    }),
});

const collectorOptions = {
    url: 'https://otel.bridgex.dev/v1/logs',
};
const logExporter = new OTLPLogExporter(collectorOptions);

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor({
        export: (logs, cb) => {
            for (const log of logs) {
                const message = `${log.body?.['msg']} traceId=${log.body?.['traceId']}`;

                if (log.severityNumber === SeverityNumber.ERROR) {
                    console.error(message);
                } else if (log.severityNumber === SeverityNumber.WARN) {
                    console.warn(message);
                } else if (log.severityNumber === SeverityNumber.INFO) {
                    console.info(message);
                } else if (log.severityNumber === SeverityNumber.DEBUG) {
                    console.debug(message);
                } else if (log.severityNumber === SeverityNumber.TRACE) {
                    console.trace(message);
                } else {
                    console.log(message);
                }
            }

            cb({code: 0});
        },
        shutdown: () => Promise.resolve(),
    })
);
logs.setGlobalLoggerProvider(loggerProvider);
