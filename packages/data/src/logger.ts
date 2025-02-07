/* eslint-disable no-console */
import {context} from './context.js';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'none';
const LOG_LEVELS: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    none: 5,
};

export interface Logger {
    setLogLevel(level: LogLevel): void;

    trace(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, error: unknown): void;

    time<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export class ConsoleLogger implements Logger {
    private logLevel: LogLevel = 'info';

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel];
    }

    trace(message: string, ...args: unknown[]): void {
        if (!this.shouldLog('trace')) return;

        const cx = context();
        console.debug(
            `[${cx.traceId}] [${this.ts()}] [TRC] ${message}`,
            ...args.map(x => JSON.stringify(x, null, 4))
        );
    }
    debug(message: string, ...args: unknown[]): void {
        if (!this.shouldLog('debug')) return;

        const cx = context();
        console.debug(
            `[${cx.traceId}] [${this.ts()}] [DBG] ${message}`,
            ...args
        );
    }
    info(message: string, ...args: unknown[]): void {
        if (!this.shouldLog('info')) return;

        const cx = context();
        console.info(
            `[${cx.traceId}] [${this.ts()}] [INF] ${message}`,
            ...args
        );
    }
    warn(message: string, ...args: unknown[]): void {
        if (!this.shouldLog('warn')) return;

        const cx = context();
        console.warn(
            `[${cx.traceId}] [${this.ts()}] [WRN] ${message}`,
            ...args
        );
    }
    error(message: string, error?: unknown): void {
        if (!this.shouldLog('error')) return;

        const cx = context();
        if (arguments.length >= 2) {
            console.error(
                `[${cx.traceId}] [${this.ts()}] [ERR] ${message}`,
                error
            );
        } else {
            console.error(`[${cx.traceId}] [${this.ts()}] [ERR] ${message}`);
        }
    }

    async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        this.info(`${name} took ${end - start}ms`);
        return result;
    }

    private ts(): string {
        return new Date().toISOString();
    }
}

export const logger: Logger = new ConsoleLogger();
