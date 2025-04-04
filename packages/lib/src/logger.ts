/* eslint-disable no-console */
import {logs, SeverityNumber} from '@opentelemetry/api-logs';
import {context, type NestedAttributeMap} from './context.js';
import {AppError, toError} from './errors.js';
import {assertNever} from './utils.js';

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

export interface Logger {
    enabled(level: LogLevel): boolean;

    setLogLevel(level: LogLevel): void;
    trace(
        ...args: [error: AppError, message: string] | [message: string]
    ): void;
    debug(
        ...args:
            | [error: AppError, message: string]
            | [message: string]
            | [() => string]
    ): void;
    info(...args: [error: AppError, message: string] | [message: string]): void;
    warn(...args: [error: AppError, message: string] | [message: string]): void;
    error(
        ...args: [error: AppError, message: string] | [message: string]
    ): void;
    fatal(
        ...args: [error: AppError, message: string] | [message: string]
    ): void;

    log(
        level: LogLevel,
        ...args:
            | [error: AppError, message: string]
            | [message: string]
            | [() => string]
    ): void;

    time<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

abstract class BaseLogger implements Logger {
    private logLevel: LogLevel = 'info';

    protected abstract _log(
        level: LogLevel,
        ...args: [error: AppError, message: string] | [message: string]
    ): void;

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    log(
        level: LogLevel,
        ...args:
            | [error: AppError, message: string]
            | [message: string]
            | [() => string]
    ): void {
        if (!this.enabled(level)) return;

        if (args[0] instanceof Function) {
            this._log(level, args[0]());
        } else {
            this._log(
                level,
                ...(args as
                    | [error: AppError, message: string]
                    | [message: string])
            );
        }
    }

    enabled(level: LogLevel): boolean {
        return LogLevelValues[level] >= LogLevelValues[this.logLevel];
    }

    trace(
        ...args:
            | [error: AppError, message: string]
            | [message: string]
            | [() => string]
    ): void {
        this.log('trace', ...args);
    }
    debug(
        ...args:
            | [error: AppError, message: string]
            | [message: string]
            | [() => string]
    ): void {
        this.log('debug', ...args);
    }
    info(
        ...args: [error: AppError, message: string] | [message: string]
    ): void {
        this.log('info', ...args);
    }
    warn(
        ...args: [error: AppError, message: string] | [message: string]
    ): void {
        this.log('warn', ...args);
    }
    error(
        ...args: [error: AppError, message: string] | [message: string]
    ): void {
        this.log('error', ...args);
    }
    fatal(
        ...args: [error: AppError, message: string] | [message: string]
    ): void {
        this.log('fatal', ...args);
    }

    async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        this.debug(`${name} took ${(end - start).toFixed(0)}ms`);
        return result;
    }
}

class OtelLogger extends BaseLogger {
    private readonly logger = logs.getLogger('syncwave', '1.0.0');

    _log(
        level: LogLevel,
        ...args: [error: AppError, message: string] | [message: string]
    ) {
        const ctx = context();
        let log: NestedAttributeMap = {
            traceId: ctx.traceId,
            spanId: ctx.spanId,
            level,
        };
        let message: string;
        if (args.length === 2) {
            const error = toError(args[0]);
            log = {
                ...log,
                error: error.toJSON(),
            };
            message = args[1];
        } else {
            message = args[0];
        }

        if (LogLevelValues[level] >= LogLevelValues['error']) {
            const stack = new AppError('log stack').stack;

            if (stack) {
                log['stack'] = stack.split('\n').slice(1).join('\n');
            }
        }
        this.logger.emit({
            severityNumber: LogLevelValues[level],
            severityText: level.toUpperCase(),
            body: {...log, msg: message},
        });
    }
}

class ConsoleLogger extends BaseLogger {
    private level: LogLevel = 'debug';

    _log(
        level: LogLevel,
        ...args: [error: AppError, message: string] | [message: string]
    ) {
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

        if (args.length === 2) {
            const error = toError(args[0]);
            func(
                `${this.formatLevel(level)} ${args[1]}\n${error.stack ? error.stack : error.message}`
            );
        } else {
            func(`${this.formatLevel(level)} ${args[0]}`);
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

export const log: Logger =
    process.env.NODE_ENV === 'test' ? new ConsoleLogger() : new OtelLogger();
