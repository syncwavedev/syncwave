import opentelemetry, {
    propagation,
    type Span,
    trace,
    type Tracer,
} from '@opentelemetry/api';
import AsyncContext from '@webfill/async-context';
import {Deferred} from './deferred.js';
import {CancelledError} from './errors.js';
import {log, type LogLevel} from './logger.js';
import {Stream, toStream} from './stream.js';
import {type Brand, runAll, type Unsubscribe} from './utils.js';

export interface NestedAttributeMap
    extends Record<
        string,
        NestedAttributeMap[] | NestedAttributeMap | AttributeValue
    > {}

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

export type AttributeValue = number | string | boolean | undefined;

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

export type Cancel = (reason: unknown) => void;

export type CancelBehavior = 'reject' | 'resolve' | 'suspend';

export type TraceId = Brand<string, 'trace_id'>;

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
        tracer: trace.getTracer('syncwave'),
    });

    private readonly span: Span;
    readonly traceId: TraceId;
    readonly spanId: string;
    readonly spanName: string;

    public static restore(
        options: ContextOptions,
        carrier: ContextCarrier
    ): [Context, Cancel] {
        const otCtx = getOtSpanContext(context().span);

        const extractedCtx = propagation.extract(otCtx, carrier);
        const ctx = new Context({
            options,
            parent: extractedCtx,
            tracer: trace.getTracer('syncwave'),
            links: [context().span.spanContext()],
        });
        return [ctx, reason => ctx.end(reason)];
    }
    private readonly tracer: Tracer;

    private constructor(params: ContextConstructorParams) {
        const contextOptionsJSON = JSON.stringify(params.options);
        if (contextOptionsJSON.length > 1000) {
            log.warn('context options are too big: ' + contextOptionsJSON);
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
        this.spanName = params.options.span;
    }

    private endCallbacks: Array<(reason: unknown) => Promise<void> | void> = [];
    private _ended = false;
    private _endRequested = false;
    private children: Context[] = [];
    private _endReason: unknown = undefined;

    get isActive() {
        return !this._ended;
    }

    extract(): ContextCarrier {
        const carrier: ContextCarrier = {traceparent: '', tracestate: ''};
        propagation.inject(getOtSpanContext(this.span), carrier);

        return carrier;
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

    onEnd(cb: (reason: unknown) => void): Unsubscribe {
        if (this._endRequested) {
            log.debug('Context.onEnd: new onEnd was registered after end');
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

    runChildSync<R>(options: ContextOptions, fn: () => R): R {
        const [ctx, endCtx] = this.createChild(options);
        try {
            return ctx.run(fn);
        } finally {
            endCtx('end of runChild');
        }
    }

    runChild<R extends Promise<unknown> | AsyncIterable<unknown>>(
        options: ContextOptions,
        fn: () => R
    ): R extends Promise<infer T>
        ? Promise<T>
        : R extends AsyncIterable<infer T>
          ? Stream<T>
          : never {
        const [ctx, endCtx] = this.createChild(options);
        try {
            const result = ctx.run(fn);

            if (result instanceof Promise) {
                return result.finally(() => endCtx('end of runChild')) as never;
            } else {
                return toStream(result).finally(() => {
                    endCtx('end of runChild');
                }) as never;
            }
        } catch (error) {
            endCtx('end of runChild');
            throw error;
        }
    }

    createChild(
        options: ContextOptions,
        startNewSpan = false
    ): [Context, Cancel] {
        if (this._endRequested) {
            log.warn('Context.createChild: new child was created after end');
        }

        const child = new Context({
            options: {
                attributes: options.attributes,
                span: options.span,
            },
            parent: startNewSpan ? undefined : getOtSpanContext(this.span),
            tracer: this.tracer,
            links: startNewSpan ? [this.span.spanContext()] : [],
        });

        if (this._endRequested || this._ended) {
            child.end(this._endReason);
        }

        this.children.push(child);
        return [
            child,
            (reason: unknown) => {
                child.end(reason);
                this.children = this.children.filter(x => x !== child);
            },
        ];
    }

    detach(options: ContextOptions, fn: () => void): void {
        const [ctx] = this.createDetached(options);
        ctx.run(fn);
    }

    createDetached(options: ContextOptions): [Context, Cancel] {
        const ctx = new Context({
            options,
            parent: getOtSpanContext(this.span),
            tracer: this.tracer,
            links: [],
        });
        return [ctx, (reason: unknown) => ctx.end(reason)];
    }

    private end(reason: unknown) {
        if (this._endRequested || this._ended) {
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

    addEvent(level: LogLevel, message: string, attributes?: AttributeMap) {
        if (this.isActive) {
            this.span.addEvent(
                `[${level.toUpperCase()}] ${message}`,
                attributes,
                performance.now()
            );
        } else {
            log.warn(
                'context is not active, cannot add event: ' +
                    JSON.stringify({name: message, attributes})?.slice(0, 100)
            );
        }
    }
}

const _ctx = new AsyncContext.Variable<Context | undefined>({
    defaultValue: Context._root,
});
export function context(): Context {
    return _ctx.get() ?? Context._root;
}
