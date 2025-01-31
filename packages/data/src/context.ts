import {customAlphabet} from 'nanoid';
import {astream, AsyncStream} from './async-stream.js';
import {Deferred} from './deferred.js';
import {AppError} from './errors.js';
import {Brand, Nothing} from './utils.js';

export class CancelledError extends AppError {}

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
    T extends (cx: Cx, ...args: any[]) => Promise<any> | AsyncIterable<any>,
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

export class Cx {
    public readonly traceId = createTraceId();

    // this should not exist
    static create() {
        return Cx.background().withCancel();
    }

    static scope<T extends (child: Cx) => Promise<T> | AsyncIterable<T>>(
        fn: T
    ): AsyncRemap<ReturnType<T>> {
        return (createScopedFunc(fn) as any)(Cx.background());
    }

    static background() {
        return new Cx();
    }

    static todo() {
        return Cx.background();
    }

    static none() {
        return Cx.todo();
    }

    static test() {
        return Cx.todo();
    }

    static cancelled() {
        const cx = new Cx();
        cx._cancelled = true;
        return cx;
    }

    private constructor() {}

    private readonly cleaners: Array<() => Promise<void> | void> = [];
    private _cancelled = false;
    private children: Cx[] = [];

    get alive() {
        return !this._cancelled;
    }

    async race<T>(cx: Cx, promise: Promise<T>, message?: string) {
        const result = await Promise.race([
            this.cancelPromise().then(() => ({
                type: 'cancel' as const,
            })),
            promise.then(value => ({type: 'value' as const, value})),
        ]);

        if (result.type === 'cancel') {
            throw new CancelledError(cx, message);
        }

        return result.value;
    }

    scope<T extends (child: Cx) => Promise<T> | AsyncIterable<T>>(fn: T) {
        return createScopedFunc(fn);
    }

    ensureAlive(cx: Cx, message?: string) {
        if (!this.alive) {
            throw new CancelledError(cx, message);
        }
    }

    cancelPromise(): Promise<void> {
        const signal = new Deferred<void>();
        this.onCancel(() => {
            signal.resolve(Cx.todo());
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

    withCancel(): [Cx, Cancel] {
        const child = new Cx();
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
