/* eslint-disable no-console */
import {context} from './context.js';
import {toError} from './errors.js';

export interface Logger {
    trace(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, error: unknown): void;
}

export class ConsoleLogger implements Logger {
    trace(message: string, ...args: unknown[]): void {
        const cx = context();
        console.trace(
            `[${cx.traceId}] [${this.ts()}] [TRC] ${message}`,
            ...args
        );
    }
    debug(message: string, ...args: unknown[]): void {
        const cx = context();
        // console.debug(`[${cx.traceId}] [${this.ts()}] [DBG] ${message}`, ...args);
    }
    info(message: string, ...args: unknown[]): void {
        const cx = context();
        console.info(
            `[${cx.traceId}] [${this.ts()}] [INF] ${message}`,
            ...args
        );
    }
    warn(message: string, ...args: unknown[]): void {
        const cx = context();
        console.warn(
            `[${cx.traceId}] [${this.ts()}] [WRN] ${message}`,
            ...args
        );
    }
    error(message: string, error?: unknown): void {
        const cx = context();
        if (arguments.length >= 2) {
            console.error(
                `[${cx.traceId}] [${this.ts()}] [ERR] ${message}`,
                toError(error)
            );
        } else {
            console.error(`[${cx.traceId}] [${this.ts()}] [ERR] ${message}`);
        }
    }

    private ts(): string {
        return new Date().toISOString();
    }
}

export const logger: Logger = new ConsoleLogger();
