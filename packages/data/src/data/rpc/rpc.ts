import {TypeOf, ZodType} from 'zod';
import {AsyncStream} from '../../async-stream.js';
import {Context} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {assertNever} from '../../utils.js';
import {MessageHeaders} from '../communication/message.js';

export interface Handler<TState, TRequest, TResponse> {
    type: 'handler';
    req: ZodType<TRequest>;
    res: ZodType<TResponse>;
    handle(
        ctx: Context,
        state: TState,
        req: TRequest,
        headers: MessageHeaders
    ): Promise<TResponse>;
}

export interface Streamer<TState, TRequest, TItem> {
    type: 'streamer';
    req: ZodType<TRequest>;
    item: ZodType<TItem>;
    stream(
        ctx: Context,
        state: TState,
        req: TRequest,
        headers: MessageHeaders
    ): AsyncIterable<TItem>;
}

export type Processor<TState, TRequest, TResult> =
    | Handler<TState, TRequest, TResult>
    | Streamer<TState, TRequest, TResult>;

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
        ctx: Context,
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
        ctx: Context,
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ) {
        req = options.req.parse(req);
        const res = await options.handle(ctx, state, req, headers);
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
        ctx: Context,
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
        ctx: Context,
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ): AsyncIterable<TypeOf<TItemSchema>> {
        req = options.req.parse(req);
        for await (const item of options.stream(ctx, state, req, headers)) {
            yield options.item.parse(item);
        }
    }
    return {
        type: 'streamer' as const,
        req: options.req,
        item: options.item,
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
    TProcessor extends Streamer<any, infer R, infer I>
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
    map: (
        ctx: Context,
        state: TStatePublic
    ) => TStatePrivate | Promise<TStatePrivate>
): MapApiState<TApi, TStatePublic> {
    return applyMiddleware(
        api,
        async (ctx, next, state) => await next(ctx, map(ctx, state))
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
        result[key] = decorate(api[key]);
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
        ctx: Context,
        next: (ctx: Context, state: TStatePrivate) => Promise<void>,
        state: TStatePublic,
        headers: MessageHeaders
    ) => Promise<void>
): MapApiState<TApi, TStatePublic> {
    return decorateApi<TStatePrivate, TStatePublic, TApi>(api, processor => {
        async function work(
            ctx: Context,
            state: TStatePublic,
            req: unknown,
            headers: MessageHeaders
        ) {
            const signal = new Deferred<any>();
            middleware(
                ctx,
                async (ctx, newState) => {
                    if (processor.type === 'handler') {
                        const result = await processor.handle(
                            ctx,
                            newState,
                            req,
                            headers
                        );
                        signal.resolve(result);
                    } else if (processor.type === 'streamer') {
                        const result = processor.stream(
                            ctx,
                            newState,
                            req,
                            headers
                        );
                        signal.resolve(result);
                    } else {
                        assertNever(processor);
                    }
                },
                state,
                headers
            ).catch(error => {
                if (signal.state !== 'pending') {
                    console.error(
                        '[ERR] middleware failed after next()',
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
                handle: async (ctx, state, request, headers) => {
                    return work(ctx, state, request, headers);
                },
            } satisfies Handler<TStatePublic, any, any>;
        } else if (processor.type === 'streamer') {
            return {
                type: 'streamer',
                req: processor.req,
                item: processor.item,
                stream: async function* (ctx, state, request, headers) {
                    yield* await work(ctx, state, request, headers);
                },
            } satisfies Streamer<TStatePublic, any, any>;
        } else {
            assertNever(processor);
        }
    });
}

export type InferRpcClient<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Streamer<any, infer TReq, infer TItem>
        ? (
              ctx: Context,
              req: TReq,
              headers?: MessageHeaders
          ) => AsyncStream<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (ctx: Context, req: TReq, headers?: MessageHeaders) => Promise<TRes>
          : never;
};

export type InferRpcClientWithRequiredHeaders<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Streamer<any, infer TReq, infer TItem>
        ? (
              ctx: Context,
              req: TReq,
              headers: MessageHeaders
          ) => AsyncStream<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (ctx: Context, req: TReq, headers: MessageHeaders) => Promise<TRes>
          : never;
};
