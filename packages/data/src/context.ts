import AsyncContext from '@webfill/async-context';
import {customAlphabet} from 'nanoid';
import {Deferred} from './deferred.js';
import {CancelledError} from './errors.js';
import {Brand, Nothing, Unsubscribe} from './utils.js';

export type Cancel = () => Nothing;

export type CancelBehavior = 'reject' | 'resolve' | 'suspend';

const traceNanoId = customAlphabet('1234567890abcdef', 10);

export type TraceId = Brand<string, 'trace_id'>;

export function createTraceId(): TraceId {
    return traceNanoId() as TraceId;
}

export class Context {
    private static _root = new Context();
    static root() {
        return Context._root;
    }

    private constructor(public readonly traceId = createTraceId()) {}

    private cleaners: Array<() => Promise<void> | void> = [];
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

    onCancel(cb: () => Nothing): Unsubscribe {
        // wrap to guarantee function uniqueness (needed for unsubscribe filtration)
        const wrapper = () => cb();

        if (this._cancelled) {
            wrapper();
        } else {
            this.cleaners.push(wrapper);
        }

        return () => {
            this.cleaners = this.cleaners.filter(x => x !== wrapper);
        };
    }

    createChild(options?: {traceId?: TraceId}): [Context, Cancel] {
        const child = new Context(options?.traceId);
        this.children.push(child);
        return [
            child,
            () => {
                child.cancel();
                this.children = this.children.filter(x => x !== child);
            },
        ];
    }

    createBackground(options?: {traceId?: TraceId}): [Context, Cancel] {
        return Context.root().createChild(options);
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
export function context(): Context {
    return _ctx.get() ?? Context.root();
}
