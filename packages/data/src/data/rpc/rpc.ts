import {TypeOf, ZodObject, ZodType} from 'zod';
import {AsyncStream} from '../../async-stream.js';
import {Context} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {assertNever} from '../../utils.js';
import {Message} from '../communication/message.js';

export interface Handler<TState, TRequest, TResponse> {
    type: 'handler';
    handle(ctx: Context, state: TState, request: TRequest): Promise<TResponse>;
}

export type HandlerRequestSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, infer R, any> ? R : never;

export type HandlerResponseSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, any, infer R> ? R : never;

export interface HandlerOptions<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TResponseSchema extends ZodType<any, any, any>,
> {
    req: TRequestSchema;
    res: TResponseSchema;
    handle: (
        ctx: Context,
        state: TState,
        request: TypeOf<TRequestSchema>
    ) => Promise<TypeOf<TResponseSchema>>;
}

export function handler<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TResponseSchema extends ZodType<any, any, any>,
>(
    options: HandlerOptions<TState, TRequestSchema, TResponseSchema>
): Handler<TState, TypeOf<TRequestSchema>, TypeOf<TResponseSchema>> {
    async function wrapper(
        ctx: Context,
        state: TState,
        request: TypeOf<TRequestSchema>
    ) {
        request = options.req.parse(request);
        const res = await options.handle(ctx, state, request);
        return options.res.parse(res);
    }

    return {
        type: 'handler' as const,
        handle: wrapper,
    };
}

export interface Streamer<TState, TRequest, TItem> {
    type: 'streamer';
    stream(ctx: Context, state: TState, req: TRequest): AsyncIterable<TItem>;
}

export type StreamerRequestSchema<T extends Streamer<any, any, any>> =
    T extends Streamer<any, infer R, any> ? R : never;

export type StreamerItemSchema<T extends Streamer<any, any, any>> =
    T extends Streamer<any, any, infer R> ? R : never;

export interface StreamerOptions<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TItemSchema extends ZodType<any, any, any>,
> {
    req: TRequestSchema;
    item: TItemSchema;
    stream: (
        ctx: Context,
        state: TState,
        req: TypeOf<TRequestSchema>
    ) => AsyncIterable<TypeOf<TItemSchema>>;
}

export function streamer<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TItemSchema extends ZodType<any, any, any>,
>(
    options: StreamerOptions<TState, TRequestSchema, TItemSchema>
): Streamer<TState, TypeOf<TRequestSchema>, TypeOf<TItemSchema>> {
    async function* wrapper(
        ctx: Context,
        state: TState,
        req: TypeOf<TRequestSchema>
    ): AsyncIterable<TypeOf<TItemSchema>> {
        req = options.req.parse(req);
        for await (const item of options.stream(ctx, state, req)) {
            yield options.item.parse(item);
        }
    }
    return {
        type: 'streamer' as const,
        stream: wrapper,
    };
}

export type Api<TState> = Record<
    string,
    Handler<TState, any, any> | Streamer<TState, any, any>
>;

export function createApi<TState>(): <T extends Api<TState>>(def: T) => T {
    return def => def;
}

type ChangeApiState<TApi extends Api<any>, TNewState> = {
    [K in keyof TApi]: TApi[K] extends Streamer<any, infer R, infer I>
        ? Streamer<TNewState, R, I>
        : TApi[K] extends Handler<any, infer TReq, infer TRes>
          ? Handler<TNewState, TReq, TRes>
          : never;
};

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
): ChangeApiState<TApi, TStatePublic> {
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
        processor:
            | Handler<TStatePrivate, unknown, any>
            | Streamer<TStatePrivate, unknown, any>
    ) =>
        | Handler<TStatePublic, unknown, any>
        | Streamer<TStatePublic, unknown, any>
): ChangeApiState<TApi, TStatePublic> {
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
        state: TStatePublic
    ) => Promise<void>
): ChangeApiState<TApi, TStatePublic> {
    return decorateApi<TStatePrivate, TStatePublic, TApi>(api, processor => {
        async function work(
            ctx: Context,
            state: TStatePublic,
            request: unknown
        ) {
            const signal = new Deferred<any>();
            middleware(
                ctx,
                async (ctx, newState) => {
                    if (processor.type === 'handler') {
                        const result = await processor.handle(
                            ctx,
                            newState,
                            request
                        );
                        signal.resolve(result);
                    } else if (processor.type === 'streamer') {
                        const result = processor.stream(ctx, newState, request);
                        signal.resolve(result);
                    } else {
                        assertNever(processor);
                    }
                },
                state
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
                handle: async (state, request, cx) => {
                    return work(state, request, cx);
                },
            };
        } else if (processor.type === 'streamer') {
            return {
                type: 'streamer',
                stream: async function* (state, request, cx) {
                    yield* await work(state, request, cx);
                },
            };
        } else {
            assertNever(processor);
        }
    });
}

export type InferRpcClient<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Streamer<any, infer TReq, infer TItem>
        ? (ctx: Context, req: TReq) => AsyncStream<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (ctx: Context, req: TReq) => Promise<TRes>
          : never;
};

export interface ProcessorContext<TState> {
    message: Message;
    state: TState;
}
