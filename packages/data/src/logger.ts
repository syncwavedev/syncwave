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
        console.trace(`[${cx.traceId}] [TRC] ${message}`, ...args);
    }
    debug(message: string, ...args: unknown[]): void {
        const cx = context();
        // console.debug(`[${cx.traceId}] [DBG] ${message}`, ...args);
    }
    info(message: string, ...args: unknown[]): void {
        const cx = context();
        console.info(`[${cx.traceId}] [INF] ${message}`, ...args);
    }
    warn(message: string, ...args: unknown[]): void {
        const cx = context();
        console.warn(`[${cx.traceId}] [WRN] ${message}`, ...args);
    }
    error(message: string, error?: unknown): void {
        const cx = context();
        if (arguments.length >= 2) {
            console.error(`[${cx.traceId}] [ERR] ${message}`, toError(error));
        } else {
            console.error(`[${cx.traceId}] [ERR] ${message}`);
        }
    }
}

export const logger: Logger = new ConsoleLogger();
