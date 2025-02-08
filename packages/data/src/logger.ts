import {pino as createPino, Level} from 'pino';
import {context} from './context.js';
import {AppError, toError} from './errors.js';

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

export class Logger {
    private readonly pino = createPino();

    setLogLevel(level: LogLevel): void {
        this.pino.level = level;
    }

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

    log(
        level: Level,
        ...args: [error: AppError, message: string] | [message: string]
    ) {
        const context = this.context();
        let message: string;
        if (args.length === 2) {
            context['error'] = toError(args[0]);
            message = args[1];
        } else {
            message = args[0];
        }

        if (LogLevelValues[level] >= LogLevelValues['error']) {
            context['stack'] = new AppError('log stack').stack;
        }
        this.pino[level](context, message);
    }

    private context(): Record<string, unknown> {
        return {
            traceId: context().traceId,
            shortTraceId: context().traceId.slice(0, 4),
        };
    }

    async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        this.debug(`${name} took ${(end - start).toFixed(0)}ms`);
        return result;
    }
}

export const log = new Logger();
