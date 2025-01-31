import {TypeOf, z, ZodType} from 'zod';
import {astream, AsyncStream} from '../../async-stream.js';
import {Cx} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {logger} from '../../logger.js';
import {assertNever} from '../../utils.js';
import {MessageHeaders} from '../communication/message.js';

export interface Handler<TState, TRequest, TResponse> {
    type: 'handler';
    req: ZodType<TRequest>;
    res: ZodType<TResponse>;
    handle(
        state: TState,
        req: TRequest,
        headers: MessageHeaders
    ): Promise<TResponse>;
}

export interface Streamer<TState, TRequest, TItem> {
    type: 'streamer';
    req: ZodType<TRequest>;
    item: ZodType<TItem>;
    observer: boolean;
    stream(
        state: TState,
        req: TRequest,
        headers: MessageHeaders
    ): AsyncIterable<[Cx, TItem]>;
}

export type ObserverItem<T> = z.infer<ReturnType<typeof zObserverItem<T>>>;

export interface Observer<TState, TRequest, TValue>
    extends Streamer<TState, TRequest, ObserverItem<TValue>> {
    _obs: true;
}

export type Processor<TState, TRequest, TResult> =
    | Handler<TState, TRequest, TResult>
    | Streamer<TState, TRequest, TResult>
    | Observer<TState, TRequest, TResult>;

export type HandlerRequestSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, infer R, any> ? R : never;

export type HandlerResponseSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, any, infer R> ? R : never;

export interface HandlerOptions<
    TState,
    TRequestSchema extends ZodType<any, any, any>,
    TResponseSchema extends ZodType<any, any, any>,
> {
    req: TRequestSchema;
    res: TResponseSchema;
    handle: (
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ) => Promise<TypeOf<TResponseSchema>>;
}

export function handler<
    TState,
    TRequestSchema extends ZodType<any, any, any>,
    TResponseSchema extends ZodType<any, any, any>,
>(
    options: HandlerOptions<TState, TRequestSchema, TResponseSchema>
): Handler<TState, TypeOf<TRequestSchema>, TypeOf<TResponseSchema>> {
    async function wrapper(
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ) {
        req = options.req.parse(req);
        const res = await options.handle(cx, state, req, headers);
        return options.res.parse(res);
    }

    return {
        type: 'handler' as const,
        req: options.req,
        res: options.res,
        handle: wrapper,
    };
}

export type StreamerRequestSchema<T extends Streamer<any, any, any>> =
    T extends Streamer<any, infer R, any> ? R : never;

export type StreamerItemSchema<T extends Streamer<any, any, any>> =
    T extends Streamer<any, any, infer R> ? R : never;

export interface StreamerOptions<
    TState,
    TRequestSchema extends ZodType<any, any, any>,
    TItemSchema extends ZodType<any, any, any>,
> {
    req: TRequestSchema;
    item: TItemSchema;
    stream: (
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ) => AsyncIterable<TypeOf<TItemSchema>>;
}

export function streamer<
    TState,
    TRequestSchema extends ZodType<any, any, any>,
    TItemSchema extends ZodType<any, any, any>,
>(
    options: StreamerOptions<TState, TRequestSchema, TItemSchema>
): Streamer<TState, TypeOf<TRequestSchema>, TypeOf<TItemSchema>> {
    async function* wrapper(
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ): AsyncIterable<TypeOf<TItemSchema>> {
        req = options.req.parse(req);
        for await (const item of options.stream(cx, state, req, headers)) {
            yield options.item.parse(item);
        }
    }
    return {
        type: 'streamer' as const,
        req: options.req,
        observer: false,
        item: options.item,
        stream: wrapper,
    };
}

export type ObserverRequestSchema<T extends Observer<any, any, any>> =
    T extends Observer<any, infer R, any> ? R : never;

export type ObserverItemSchema<T extends Observer<any, any, any>> =
    T extends Observer<any, any, infer R> ? R : never;

export interface ObserverOptions<
    TState,
    TRequestSchema extends ZodType<any, any, any>,
    TValueSchema extends ZodType<any, any, any>,
> {
    req: TRequestSchema;
    value: TValueSchema;
    observe: (
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ) => Promise<
        [
            initialValue: TypeOf<TValueSchema>,
            stream: AsyncIterable<[Cx, TypeOf<TValueSchema>]>,
        ]
    >;
}

function zObserverItem<T>(valueSchema: ZodType<T>) {
    return z.discriminatedUnion('type', [
        z.object({type: z.literal('start'), initialValue: valueSchema}),
        z.object({type: z.literal('next'), value: valueSchema}),
    ]);
}

export function observer<
    TState,
    TRequestSchema extends ZodType<any, any, any>,
    TValueSchema extends ZodType<any, any, any>,
>(
    options: ObserverOptions<TState, TRequestSchema, TValueSchema>
): Observer<TState, TypeOf<TRequestSchema>, TypeOf<TValueSchema>> {
    function wrapper(
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ): AsyncIterable<[Cx, TypeOf<TValueSchema>]> {
        req = options.req.parse(req);
        return astream<
            [TypeOf<TValueSchema>, AsyncIterable<[Cx, TypeOf<TValueSchema>]>]
        >(options.observe(cx, state, req, headers).then(x => [cx, x])).flatMap(
            (cx, [initialValue, stream]) => {
                return astream<ObserverItem<TypeOf<TValueSchema>>>([
                    [cx, {type: 'start', initialValue}],
                ]).concat(
                    astream(stream).map((cx, value) => ({
                        type: 'next',
                        value,
                    }))
                );
            }
        );
    }

    return {
        type: 'streamer' as const,
        observer: true,
        _obs: true,
        req: options.req,
        item: zObserverItem(options.value as ZodType<TypeOf<TValueSchema>>),
        stream: wrapper,
    };
}

export type Api<TState> = Record<string, Processor<TState, any, any>>;

export function createApi<TState>(): <T extends Api<TState>>(def: T) => T {
    return def => def;
}

type MapApiState<TApi extends Api<any>, TNewState> = {
    [K in keyof TApi]: MapProcessorState<TApi[K], TNewState>;
};

export type MapProcessorState<
    TProcessor extends Processor<any, any, any>,
    TNewState,
> =
    TProcessor extends Observer<any, infer R, infer V>
        ? Observer<TNewState, R, V>
        : TProcessor extends Streamer<any, infer R, infer I>
          ? Streamer<TNewState, R, I>
          : TProcessor extends Handler<any, infer TReq, infer TRes>
            ? Handler<TNewState, TReq, TRes>
            : never;

export function mapApiState<
    TStatePrivate,
    TStatePublic,
    TApi extends Api<TStatePrivate>,
>(
    api: TApi,
    map: (state: TStatePublic) => TStatePrivate | Promise<TStatePrivate>
): MapApiState<TApi, TStatePublic> {
    return applyMiddleware(
        cx,
        api,
        async (cx, next, state) => await next(cx, map(cx, state))
    );
}

export function decorateApi<
    TStatePrivate,
    TStatePublic,
    TApi extends Api<TStatePrivate>,
>(
    api: TApi,
    decorate: (
        processor: Processor<TStatePrivate, unknown, any>
    ) => Processor<TStatePublic, unknown, any>
): MapApiState<TApi, TStatePublic> {
    const result: Api<any> = {};
    for (const key of Object.keys(api)) {
        result[key] = decorate(cx, api[key]);
    }

    return result as any;
}

export function applyMiddleware<
    TStatePrivate,
    TStatePublic,
    TApi extends Api<TStatePrivate>,
>(
    api: TApi,
    middleware: (
        next: (state: TStatePrivate) => Promise<void>,
        state: TStatePublic,
        headers: MessageHeaders
    ) => Promise<void>
): MapApiState<TApi, TStatePublic> {
    return decorateApi<TStatePrivate, TStatePublic, TApi>(
        cx,
        api,
        (cx, processor) => {
            async function work(
                state: TStatePublic,
                req: unknown,
                headers: MessageHeaders
            ) {
                const signal = new Deferred<any>();
                middleware(
                    cx,
                    async (cx, newState) => {
                        if (processor.type === 'handler') {
                            const result = await processor.handle(
                                cx,
                                newState,
                                req,
                                headers
                            );
                            signal.resolve(cx, result);
                        } else if (processor.type === 'streamer') {
                            const result = processor.stream(
                                cx,
                                newState,
                                req,
                                headers
                            );
                            signal.resolve(cx, result);
                        } else {
                            assertNever(cx, processor);
                        }
                    },
                    state,
                    headers
                ).catch(error => {
                    if (signal.state !== 'pending') {
                        logger.error(
                            cx,
                            'middleware failed after next()',
                            error
                        );
                    } else {
                        signal.reject(error);
                    }
                });

                return await signal.promise;
            }
            if (processor.type === 'handler') {
                return {
                    type: 'handler',
                    req: processor.req,
                    res: processor.res,
                    handle: async (cx, state, request, headers) => {
                        return work(cx, state, request, headers);
                    },
                } satisfies Handler<TStatePublic, any, any>;
            } else if (processor.type === 'streamer') {
                return {
                    type: 'streamer',
                    req: processor.req,
                    item: processor.item,
                    observer: processor.observer,
                    stream: async function* (cx, state, request, headers) {
                        yield* await work(cx, state, request, headers);
                    },
                } satisfies Streamer<TStatePublic, any, any>;
            } else {
                assertNever(cx, processor);
            }
        }
    );
}

export type InferRpcClient<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Observer<any, infer TReq, infer TValue>
        ? (
              req: TReq,
              headers?: MessageHeaders
          ) => Promise<[initialValue: TValue, AsyncStream<TValue>]>
        : T[K] extends Streamer<any, infer TReq, infer TItem>
          ? (req: TReq, headers?: MessageHeaders) => AsyncStream<TItem>
          : T[K] extends Handler<any, infer TReq, infer TRes>
            ? (req: TReq, headers?: MessageHeaders) => Promise<TRes>
            : never;
};

export type InferRpcClientWithRequiredHeaders<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Observer<any, infer TReq, infer TValue>
        ? (
              req: TReq,
              headers: MessageHeaders
          ) => Promise<[initialValue: TValue, AsyncStream<TValue>]>
        : T[K] extends Streamer<any, infer TReq, infer TItem>
          ? (req: TReq, headers: MessageHeaders) => AsyncStream<TItem>
          : T[K] extends Handler<any, infer TReq, infer TRes>
            ? (req: TReq, headers: MessageHeaders) => Promise<TRes>
            : never;
};
