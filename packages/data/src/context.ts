import opentelemetry, {propagation, Span, trace} from '@opentelemetry/api';
import AsyncContext from '@webfill/async-context';
import {customAlphabet} from 'nanoid';
import {Deferred} from './deferred.js';
import {CancelledError} from './errors.js';
import {log} from './logger.js';
import {Brand, Nothing, runAll, Unsubscribe} from './utils.js';

// end open tracing

export interface ContextOptions {
    readonly name: string;
    readonly attributes?: Record<string, string | undefined>;
}

export type Cancel = (reason: unknown) => Nothing;

export type CancelBehavior = 'reject' | 'resolve' | 'suspend';

const traceNanoId = customAlphabet('1234567890abcdef', 10);

export type TraceId = Brand<string, 'trace_id'>;

export function createTraceId(): TraceId {
    return traceNanoId() as TraceId;
}

function getOtSpanContext(span: Span) {
    return trace.setSpan(opentelemetry.context.active(), span);
}

interface ContextCarrier {
    readonly traceparent: string;
    readonly tracestate: string;
}

export class Context {
    public static readonly _root = new Context({
        name: 'root',
    });

    private counter = 0;

    private readonly span: Span;
    public readonly traceId: TraceId;

    public static restore(
        options: ContextOptions,
        carrier: ContextCarrier
    ): Context {
        const otCtx = getOtSpanContext(context().span);

        const extractedCtx = propagation.extract(otCtx, carrier);
        return new Context(options, extractedCtx);
    }

    private constructor(
        options: ContextOptions,
        parent?: opentelemetry.Context
    ) {
        this.span = opentelemetry.trace.getTracer('syncwave').startSpan(
            options.name,
            {
                root: !parent,
                attributes: options.attributes,
            },
            parent
        );
        this.traceId = this.span.spanContext().traceId as TraceId;
    }

    private endCallbacks: Array<(reason: unknown) => Promise<void> | void> = [];
    private _cancelled = false;
    private _endRequested = false;
    private children: Context[] = [];
    private _endReason: unknown | undefined = undefined;

    get active() {
        return !this._cancelled;
    }

    extract(): ContextCarrier {
        const carrier: ContextCarrier = {traceparent: '', tracestate: ''};
        propagation.inject(getOtSpanContext(this.span), carrier);

        return carrier;
    }

    async race<T>(cx: Context, promise: Promise<T>, message?: string) {
        const result = await Promise.race([
            this.endPromise().then(() => ({
                type: 'cancel' as const,
            })),
            promise.then(value => ({type: 'value' as const, value})),
        ]);

        if (result.type === 'cancel') {
            throw new CancelledError(message ?? 'Context.race', 'context.race');
        }

        return result.value;
    }

    run<R>(fn: () => R): R {
        return _ctx.run(this, fn);
    }

    ensureActive(message?: string) {
        if (!this.active) {
            throw new CancelledError(
                message ?? 'ensureActive: Context is cancelled',
                this._endReason
            );
        }
    }

    endPromise(): Promise<void> {
        const signal = new Deferred<void>();
        this.onEnd(() => {
            signal.resolve();
        });
        return signal.promise;
    }

    onEnd(cb: (reason: unknown) => Nothing): Unsubscribe {
        if (this._endRequested) {
            // log.warn('Context.onEnd: new onEnd was registered after end');
            return () => {};
        }
        // wrap to guarantee function uniqueness (needed for unsubscribe filtration)
        const wrapper = (reason: unknown) => cb(reason);

        if (this._cancelled) {
            wrapper(
                new CancelledError('onEnd: Context is cancelled', undefined)
            );
        } else {
            this.endCallbacks.push(wrapper);
        }

        return () => {
            this.endCallbacks = this.endCallbacks.filter(x => x !== wrapper);
        };
    }

    createChild(options: ContextOptions): [Context, Cancel] {
        if (this._endRequested) {
            // log.warn('Context.createChild: new child was created after end');
        }

        const child = new Context(
            {
                attributes: options.attributes,
                name: options.name,
            },
            getOtSpanContext(this.span)
        );
        this.children.push(child);
        return [
            child,
            (reason: unknown) => {
                child.end(reason);
                this.children = this.children.filter(x => x !== child);
            },
        ];
    }

    detach(options: ContextOptions, fn: () => Nothing): void {
        const [ctx] = this.createBackground(options);
        ctx.run(fn);
    }

    createBackground(options: ContextOptions): [Context, Cancel] {
        const ctx = new Context(options, undefined);
        return [ctx, (reason: unknown) => ctx.end(reason)];
    }

    private end(reason: unknown) {
        if (this._endRequested) {
            log.warn('Context.end: end was called twice');
            return;
        }
        if (this._cancelled) {
            log.warn('Context.end: end was called after cancelled');
            return;
        }
        this._endReason = reason;

        try {
            this._endRequested = true;

            this.run(() => {
                const children = this.children;
                this.children = [];
                const endCallbacks = this.endCallbacks;
                this.endCallbacks = [];

                runAll(
                    children
                        .map(ctx => () => ctx.end(reason))
                        .concat(endCallbacks.map(cb => () => cb(reason)))
                );
            });
        } finally {
            this._cancelled = true;
            this.span.end();
        }
    }
}

const _ctx = new AsyncContext.Variable<Context | undefined>({
    defaultValue: Context._root,
});
export function context(): Context {
    return _ctx.get() ?? Context._root;
}
