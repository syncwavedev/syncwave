/* eslint-disable no-console */
import {Cx} from './context.js';
import {toError} from './errors.js';

export interface Logger {
    trace(cx: Cx, message: string, ...args: unknown[]): void;
    debug(cx: Cx, message: string, ...args: unknown[]): void;
    info(cx: Cx, message: string, ...args: unknown[]): void;
    warn(cx: Cx, message: string, ...args: unknown[]): void;
    error(cx: Cx, message: string, error: unknown): void;
}

export class ConsoleLogger implements Logger {
    trace(cx: Cx, message: string, ...args: unknown[]): void {
        console.trace(`[${cx.traceId}] [TRC] ${message}`, ...args);
    }
    debug(cx: Cx, message: string, ...args: unknown[]): void {
        console.debug(`[${cx.traceId}] [DBG] ${message}`, ...args);
    }
    info(cx: Cx, message: string, ...args: unknown[]): void {
        console.info(`[${cx.traceId}] [INF] ${message}`, ...args);
    }
    warn(cx: Cx, message: string, ...args: unknown[]): void {
        console.warn(`[${cx.traceId}] [WRN] ${message}`, ...args);
    }
    error(cx: Cx, message: string, error?: unknown): void {
        if (arguments.length >= 3) {
            console.error(
                `[${cx.traceId}] [ERR] ${message}`,
                toError(cx, error)
            );
        } else {
            console.error(`[${cx.traceId}] [ERR] ${message}`);
        }
    }
}

export const logger: Logger = new ConsoleLogger();
