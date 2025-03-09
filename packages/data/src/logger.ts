/* eslint-disable no-console */
import {pino as createPino, type Level} from 'pino';
import {ENVIRONMENT} from './constants.js';
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
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
    silent: 70,
};

export interface Logger {
    setLogLevel(level: LogLevel): void;
    trace(
        ...args: [error: AppError, message: string] | [message: string]
    ): void;
    debug(
        ...args: [error: AppError, message: string] | [message: string]
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
        level: Level,
        ...args: [error: AppError, message: string] | [message: string]
    ): void;

    time<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

abstract class BaseLogger implements Logger {
    abstract log(
        level: Level,
        ...args: [error: AppError, message: string] | [message: string]
    ): void;

    abstract setLogLevel(level: LogLevel): void;

    trace(
        ...args: [error: AppError, message: string] | [message: string]
    ): void {
        this.log('debug', ...args);
    }
    debug(
        ...args: [error: AppError, message: string] | [message: string]
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

class PinoLogger extends BaseLogger {
    private readonly pino = createPino();

    setLogLevel(level: LogLevel): void {
        this.pino.level = level;
    }

    log(
        level: Level,
        ...args: [error: AppError, message: string] | [message: string]
    ) {
        const ctx = context();
        let log: NestedAttributeMap = {
            traceId: ctx.traceId.slice(
                0,
                // less noise in logs
                ENVIRONMENT === 'dev' ? 4 : undefined
            ),
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
        this.pino[level]({...log, msg: message});
    }
}

class TestLogger extends BaseLogger {
    private level: LogLevel = 'debug';

    setLogLevel(level: LogLevel): void {
        this.level = level;
    }

    log(
        level: Level,
        ...args: [error: AppError, message: string] | [message: string]
    ) {
        if (LogLevelValues[level] < LogLevelValues[this.level]) {
            return;
        }

        const func = {
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

    formatLevel(level: Level) {
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
        } else {
            assertNever(level);
        }
    }
}

export const log: Logger =
    process.env.NODE_ENV === 'test' ? new TestLogger() : new PinoLogger();
