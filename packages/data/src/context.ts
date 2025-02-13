import opentelemetry, {
    propagation,
    Span,
    trace,
    Tracer,
} from '@opentelemetry/api';
import AsyncContext from '@webfill/async-context';
import {customAlphabet} from 'nanoid';
import {Deferred} from './deferred.js';
import {AppError, CancelledError} from './errors.js';
import {log, LogLevel} from './logger.js';
import {Brand, Nothing, runAll, Unsubscribe} from './utils.js';

export interface NestedAttributeMap
    extends Record<string, NestedAttributeMap | AttributeValue> {}

export function flattenAttributeMap(obj: NestedAttributeMap): AttributeMap {
    const result: AttributeMap = {};

    function flatten(obj: NestedAttributeMap, prefix = '') {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                flatten(obj[key] as NestedAttributeMap, prefix + key + '.');
            } else {
                result[prefix + key] = obj[key];
            }
        }
    }

    flatten(obj);

    return result;
}

export type AttributeValue = number | string | boolean;

export interface AttributeMap extends Record<string, AttributeValue> {}

export function addPrefixToAttributes(attr: AttributeMap, prefix: string) {
    const result: AttributeMap = {};
    for (const key in attr) {
        result[`${prefix}${key}`] = attr[key];
    }
    return result;
}

export interface ContextOptions {
    readonly span: string;
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

interface ContextConstructorParams {
    options: ContextOptions;
    parent: opentelemetry.Context | undefined;
    links: opentelemetry.SpanContext[];
    tracer: Tracer;
}

export class Context {
    public static readonly _root = new Context({
        options: {
            span: 'root',
        },
        links: [],
        parent: undefined,
        tracer: trace.getTracer('syncwave-data'),
    });

    private readonly span: Span;
    readonly traceId: TraceId;
    readonly spanId: string;

    public static restore(
        options: ContextOptions,
        carrier: ContextCarrier,
        tracer: Tracer
    ): [Context, Cancel] {
        const otCtx = getOtSpanContext(context().span);

        const extractedCtx = propagation.extract(otCtx, carrier);
        const ctx = new Context({
            options,
            parent: extractedCtx,
            tracer,
            links: [],
        });
        return [ctx, reason => ctx.end(reason)];
    }
    private readonly tracer: Tracer;

    private constructor(params: ContextConstructorParams) {
        if (JSON.stringify(params.options).length > 1000) {
            throw new AppError('context options are too big');
        }
        this.tracer = params.tracer;

        this.span = params.tracer.startSpan(
            params.options.span,
            {
                root: !params.parent,
                attributes: params.options.attributes,
                links: params.links.map(context => ({context})),
            },
            params.parent
        );
        const spanCtx = this.span.spanContext();
        this.traceId = spanCtx.traceId as TraceId;
        this.spanId = spanCtx.spanId;
    }

    private endCallbacks: Array<(reason: unknown) => Promise<void> | void> = [];
    private _ended = false;
    private _endRequested = false;
    private children: Context[] = [];
    private _endReason: unknown | undefined = undefined;

    get isActive() {
        return !this._ended;
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
        if (!this.isActive) {
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
        }
        // wrap to guarantee function uniqueness (needed for unsubscribe filtration)
        const wrapper = (reason: unknown) => cb(reason);

        if (this._ended || this._endRequested) {
            wrapper(
                new CancelledError('onEnd: context already ended', undefined)
            );
        } else {
            this.endCallbacks.push(wrapper);
        }

        return () => {
            this.endCallbacks = this.endCallbacks.filter(x => x !== wrapper);
        };
    }

    createChild(
        options: ContextOptions,
        startNewSpan = false
    ): [Context, Cancel] {
        if (this._endRequested) {
            // log.warn('Context.createChild: new child was created after end');
        }

        const child = new Context({
            options: {
                attributes: options.attributes,
                span: options.span,
            },
            parent: startNewSpan ? undefined : getOtSpanContext(this.span),
            tracer: this.tracer,
            links: [],
        });
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
        const ctx = new Context({
            options,
            parent: undefined,
            tracer: this.tracer,
            links: [],
        });
        return [ctx, (reason: unknown) => ctx.end(reason)];
    }

    private end(reason: unknown) {
        if (this._endRequested) {
            log.warn('Context.end: end was called twice');
            return;
        }
        if (this._ended) {
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
            this._ended = true;
            this.span.end();
        }
    }

    private ignoreAddEvent = 0;
    addLog(level: LogLevel, message: string, attributes?: AttributeMap) {
        if (this.ignoreAddEvent > 0) return;

        if (this.isActive) {
            this.span.addEvent(
                `[${level.toUpperCase()}] ${message}`,
                attributes,
                performance.now()
            );
        } else {
            try {
                this.ignoreAddEvent += 1;
                log.warn(
                    'context is not active, cannot add event: ' +
                        JSON.stringify({name: message, attributes})
                );
            } finally {
                this.ignoreAddEvent -= 1;
            }
        }
    }
}

const _ctx = new AsyncContext.Variable<Context | undefined>({
    defaultValue: Context._root,
});
export function context(): Context {
    return _ctx.get() ?? Context._root;
}
