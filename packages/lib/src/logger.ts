/* eslint-disable no-console */
import {logs, SeverityNumber, type AnyValue} from '@opentelemetry/api-logs';
import {
    context,
    type AttributeValue,
    type NestedAttributeMap,
} from './context.js';
import {AppError, toError} from './errors.js';
import {assertNever} from './utils.js';
import {createUuidV4} from './uuid.js';

export const SESSION_ID = createUuidV4();
globalThis.SESSION_ID = SESSION_ID;

export type LogLevel =
    | 'trace'
    | 'debug'
    | 'info'
    | 'warn'
    | 'error'
    | 'fatal'
    | 'silent';
const LogLevelValues: Record<LogLevel, number> = {
    trace: SeverityNumber.TRACE,
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
    fatal: SeverityNumber.FATAL,
    silent: 1000,
};

export interface LogMessage {
    msg: string;
    error?: unknown;
    [key: string]: unknown;
}

export interface Logger {
    enabled(level: LogLevel): boolean;

    setLogLevel(level: LogLevel): void;
    trace(message: () => LogMessage): void;
    trace(message: LogMessage): void;
    debug(message: LogMessage): void;
    debug(message: () => LogMessage): void;
    info(message: LogMessage): void;
    warn(message: LogMessage): void;
    error(message: LogMessage): void;
    fatal(message: LogMessage): void;

    log(level: LogLevel, message: LogMessage | (() => LogMessage)): void;

    time<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

abstract class BaseLogger implements Logger {
    private logLevel: LogLevel = 'debug';

    protected abstract _log(level: LogLevel, message: LogMessage): void;

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    log(level: LogLevel, message: LogMessage | (() => LogMessage)): void {
        if (!this.enabled(level)) return;

        if (message instanceof Function) {
            this._log(level, message());
        } else {
            this._log(level, message);
        }
    }

    enabled(level: LogLevel): boolean {
        return LogLevelValues[level] >= LogLevelValues[this.logLevel];
    }

    trace(message: LogMessage): void;
    trace(message: () => LogMessage): void;
    trace(message: LogMessage | (() => LogMessage)): void {
        this.log('trace', message);
    }
    debug(message: LogMessage): void;
    debug(message: () => LogMessage): void;
    debug(message: LogMessage | (() => LogMessage)): void {
        this.log('debug', message);
    }
    info(message: LogMessage): void {
        this.log('info', message);
    }
    warn(message: LogMessage): void {
        this.log('warn', message);
    }
    error(message: LogMessage): void {
        this.log('error', message);
    }
    fatal(message: LogMessage): void {
        this.log('fatal', message);
    }

    async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        this.debug({msg: `${name} took ${(end - start).toFixed(0)}ms`});
        return result;
    }
}

class OtelLogger extends BaseLogger {
    private readonly logger = logs.getLogger('syncwave', '1.0.0');

    _log(level: LogLevel, message: LogMessage) {
        const ctx = context();

        const body: Record<string, AnyValue> = {};
        for (const [key, value] of Object.entries({
            ...message,
            error: message.error ? toError(message.error) : undefined,
        })) {
            if (
                typeof value === 'object' &&
                value !== null &&
                'toJSON' in value &&
                typeof value.toJSON === 'function'
            ) {
                body[key] = (value.toJSON as () => NestedAttributeMap)();
            } else {
                body[key] = value as AttributeValue;
            }
        }

        if (LogLevelValues[level] >= LogLevelValues['error']) {
            const stack = new AppError('log stack').stack;

            if (stack) {
                body['stack'] = stack.split('\n').slice(1).join('\n');
            }
        }

        this.logger.emit({
            timestamp: getMonotonicTime(),
            severityNumber: LogLevelValues[level],
            severityText: level.toUpperCase(),
            body: {
                ...body,
                traceId: ctx.traceId,
                spanId: ctx.spanId,
                level,
                sessionId: SESSION_ID,
            },
        });
    }
}

function getHrTime() {
    if (globalThis.process?.hrtime) {
        return globalThis.process?.hrtime();
    }

    const now = Date.now();
    return [Math.trunc(now / 1000), now % 1000] as [number, number];
}

// new need this, because multiple log events might happen in the same ms in browser
// otel logger doesn't do that, so we have to do it ourselves
let lastTime = getHrTime();
function getMonotonicTime(): [number, number] {
    let now = getHrTime();
    if (
        now[0] < lastTime[0] ||
        (now[0] === lastTime[0] && now[1] < lastTime[1])
    ) {
        now = lastTime;
    }

    if (now[0] === lastTime[0] && now[1] === lastTime[1]) {
        // grafana supports microsecond level precision
        now[1] += 1000;
    }
    lastTime = now;
    return now;
}

export class ConsoleLogger extends BaseLogger {
    private level: LogLevel = 'debug';

    _log(level: LogLevel, message: LogMessage) {
        if (LogLevelValues[level] < LogLevelValues[this.level]) {
            return;
        }

        const func: (msg: string) => void = {
            fatal: console.error,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug,
            trace: console.trace,
        }[level];

        if (message.error) {
            const error = toError(message.error);
            func(
                `${this.formatLevel(level)} ${message.msg}\n${error.stack ? error.stack : error.message}`
            );
        } else {
            func(`${this.formatLevel(level)} ${message.msg}`);
        }
    }

    formatLevel(level: LogLevel) {
        if (level === 'fatal') {
            return '[FTL]';
        } else if (level === 'error') {
            return '[ERR]';
        } else if (level === 'warn') {
            return '[WRN]';
        } else if (level === 'info') {
            return '[INF]';
        } else if (level === 'debug') {
            return '[DBG]';
        } else if (level === 'trace') {
            return '[TRC]';
        } else if (level === 'silent') {
            return '[SLT]';
        } else {
            assertNever(level);
        }
    }
}

export class NullLogger extends BaseLogger {
    _log(): void {
        // do nothing
    }
}

export const log: Logger =
    process.env.NODE_ENV === 'test' ? new NullLogger() : new OtelLogger();
