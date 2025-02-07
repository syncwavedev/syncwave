import {pino as createPino} from 'pino';
import {context} from './context.js';

export type LogLevel =
    | 'trace'
    | 'debug'
    | 'info'
    | 'warn'
    | 'error'
    | 'fatal'
    | 'silent';

export class Logger {
    private readonly pino = createPino();

    setLogLevel(level: LogLevel): void {
        this.pino.level = level;
    }

    trace(message: string, ...args: unknown[]): void {
        this.pino.debug({pid: this.tid()}, message, ...args);
    }
    debug(message: string, ...args: unknown[]): void {
        this.pino.debug({pid: this.tid()}, message, ...args);
    }
    info(message: string, ...args: unknown[]): void {
        this.pino.info({pid: this.tid()}, message, ...args);
    }
    warn(message: string, ...args: unknown[]): void {
        this.pino.warn({pid: this.tid()}, message, ...args);
    }
    error(message: string, ...args: unknown[]): void {
        this.pino.error({pid: this.tid()}, message, ...args);
    }
    fatal(message: string, ...args: unknown[]): void {
        this.pino.fatal({pid: this.tid()}, message, ...args);
    }

    private tid() {
        return context().traceId.slice(0, 4);
    }

    async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        this.info(`${name} took ${(end - start).toFixed(0)}ms`);
        return result;
    }
}

export const log = new Logger();
