import AsyncContext from '@webfill/async-context';
import {customAlphabet} from 'nanoid';
import {astream, AsyncStream} from './async-stream.js';
import {Deferred} from './deferred.js';
import {assert, Brand, Nothing} from './utils.js';

export class CancelledError extends Error {}

// todo: make cancel synchronous (without Promises)

export type Cancel = () => undefined;

type AsyncRemap<T extends Promise<any> | AsyncIterable<any>> =
    T extends AsyncIterable<infer R>
        ? AsyncStream<R>
        : T extends Promise<infer R>
          ? Promise<R>
          : never;

export function scoped() {
    return createScopedFunc;
}

function createScopedFunc<
    T extends (
        cx: Context,
        ...args: any[]
    ) => Promise<any> | AsyncIterable<any>,
>(originalMethod: T): (...args: Parameters<T>) => AsyncRemap<ReturnType<T>> {
    function scopedMethod(this: any, ...args: Parameters<T>): any {
        const [childScope, cancelChild] = args[0].withCancel();
        const result = originalMethod.call(this, childScope, ...args.slice(1));

        if ('then' in result) {
            return scopedPromise(cancelChild, result);
        } else {
            return astream(scopedIterable(cancelChild, result));
        }
    }

    async function scopedPromise(
        this: any,
        cancelCx: Cancel,
        result: PromiseLike<any>
    ): Promise<any> {
        try {
            return await result;
        } finally {
            cancelCx();
        }
    }

    async function* scopedIterable(
        this: any,
        cancelCx: Cancel,
        result: AsyncIterable<any>
    ): AsyncIterable<any> {
        try {
            yield* result;
        } finally {
            cancelCx();
        }
    }

    return scopedMethod;
}

const traceNanoId = customAlphabet('1234567890abcdef', 10);

export type TraceId = Brand<string, 'trace_id'>;

export function createTraceId(): TraceId {
    return traceNanoId() as TraceId;
}

export class Context {
    public readonly traceId = createTraceId();

    // this should not exist
    static create() {
        return Context.background().withCancel();
    }

    static scope<T extends (child: Context) => Promise<T> | AsyncIterable<T>>(
        fn: T
    ): AsyncRemap<ReturnType<T>> {
        return (createScopedFunc(fn) as any)(Context.background());
    }

    static background() {
        return new Context();
    }

    static todo() {
        return Context.background();
    }

    static none() {
        return Context.todo();
    }

    static test() {
        return Context.todo();
    }

    static cancelled() {
        const cx = new Context();
        cx._cancelled = true;
        return cx;
    }

    private constructor() {}

    private readonly cleaners: Array<() => Promise<void> | void> = [];
    private _cancelled = false;
    private children: Context[] = [];

    get alive() {
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

    scope<T extends (child: Context) => Promise<T> | AsyncIterable<T>>(fn: T) {
        return createScopedFunc(fn);
    }

    ensureAlive(message?: string) {
        if (!this.alive) {
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

    onCancel(cb: () => Nothing): void {
        if (this._cancelled) {
            cb();
        } else {
            this.cleaners.push(cb);
        }
    }

    withCancel(): [Context, Cancel] {
        const child = new Context();
        this.children.push(child);
        return [
            child,
            () => {
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

const _ctx = new AsyncContext.Variable<Context>({});
export function context() {
    const result = _ctx.get();
    assert(result !== undefined);

    return result;
}

export function spawnContext(fn: () => Nothing) {
    const [child, cancelChild] = context().withCancel();

    _ctx.run(child, fn);

    return cancelChild;
}
