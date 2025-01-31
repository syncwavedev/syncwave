import AsyncContext from '@webfill/async-context';
import {customAlphabet} from 'nanoid';
import {Deferred} from './deferred.js';
import {logger} from './logger.js';
import {assert, Brand, Nothing} from './utils.js';

export class CancelledError extends Error {
    public readonly traceId = context().traceId;
}

export type Cancel = () => Nothing;

const traceNanoId = customAlphabet('1234567890abcdef', 10);

export type TraceId = Brand<string, 'trace_id'>;

export function createTraceId(): TraceId {
    return traceNanoId() as TraceId;
}

export class Context {
    static root() {
        return new Context();
    }

    private constructor(public readonly traceId = createTraceId()) {}

    private readonly cleaners: Array<() => Promise<void> | void> = [];
    private _cancelled = false;
    private children: Context[] = [];

    get active() {
        return !this._cancelled;
    }

    async race<T>(cx: Context, promise: Promise<T>, message?: string) {
        const result = await Promise.race([
            this.cancelPromise().then(() => ({
                type: 'cancel' as const,
            })),
            promise.then(value => ({type: 'value' as const, value})),
        ]);

        if (result.type === 'cancel') {
            throw new CancelledError(message);
        }

        return result.value;
    }

    run<R>(fn: () => R): R {
        return _ctx.run(this, fn);
    }

    ensureActive(message?: string) {
        if (!this.active) {
            throw new CancelledError(message);
        }
    }

    cancelPromise(): Promise<void> {
        const signal = new Deferred<void>();
        this.onCancel(() => {
            signal.resolve();
        });
        return signal.promise;
    }

    // todo: add Unsubscribe
    onCancel(cb: () => Nothing): void {
        if (this._cancelled) {
            cb();
        } else {
            this.cleaners.push(cb);
        }
    }

    spawn(options?: {traceId?: TraceId}): [Context, Cancel] {
        const child = new Context(options?.traceId);
        this.children.push(child);
        return [
            child,
            () => {
                logger.debug(`cancel ${this.traceId}`);
                child.cancel();
                this.children = this.children.filter(x => x !== child);
            },
        ];
    }

    private cancel() {
        if (this._cancelled) {
            return;
        }

        this._cancelled = true;
        this.children.forEach(x => x.cancel());
        this.cleaners.forEach(cb => cb());
    }
}

const _ctx = new AsyncContext.Variable<Context | undefined>({
    defaultValue: Context.root(),
});
export function context() {
    const result = _ctx.get();
    assert(result !== undefined);

    return result;
}
