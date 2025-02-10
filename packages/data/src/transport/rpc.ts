import {TypeOf, ZodType} from 'zod';
import {Deferred} from '../deferred.js';
import {BusinessError} from '../errors.js';
import {log} from '../logger.js';
import {Stream} from '../stream.js';
import {Message, MessageHeaders, MessageId} from '../transport/message.js';
import {Connection, TransportServer} from '../transport/transport.js';
import {assertNever} from '../utils.js';
import {launchRpcStreamerServer} from './rpc-streamer.js';

export interface Handler<TState, TRequest, TResponse> {
    type: 'handler';
    req: ZodType<TRequest>;
    res: ZodType<TResponse>;
    handle(state: TState, req: TRequest, ctx: RequestInfo): Promise<TResponse>;
}

export interface Streamer<TState, TRequest, TItem> {
    type: 'streamer';
    req: ZodType<TRequest>;
    item: ZodType<TItem>;
    stream(
        state: TState,
        req: TRequest,
        ctx: RequestInfo
    ): AsyncIterable<TItem>;
}

export type Processor<TState, TRequest, TResult> =
    | Handler<TState, TRequest, TResult>
    | Streamer<TState, TRequest, TResult>;

export type HandlerRequestSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, infer R, any> ? R : never;

export type HandlerResponseSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, any, infer R> ? R : never;

export interface RequestInfo {
    headers: MessageHeaders;
    requestId: MessageId;
}

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
        ctx: RequestInfo
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
        info: RequestInfo
    ) {
        req = options.req.parse(req);
        const res = await options.handle(state, req, info);
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
        ctx: RequestInfo
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
        ctx: RequestInfo
    ): AsyncIterable<TypeOf<TItemSchema>> {
        req = options.req.parse(req);
        for await (const item of options.stream(state, req, ctx)) {
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
    map: (state: TStatePublic) => TStatePrivate | Promise<TStatePrivate>
): MapApiState<TApi, TStatePublic> {
    return applyMiddleware(api, async (next, state) => await next(map(state)));
}

export function decorateApi<
    TStatePrivate,
    TStatePublic,
    TApi extends Api<TStatePrivate>,
>(
    api: TApi,
    decorate: (
        processor: Processor<TStatePrivate, unknown, unknown>,
        processorName: string
    ) => Processor<TStatePublic, unknown, unknown>
): MapApiState<TApi, TStatePublic> {
    const result: Api<any> = {};
    for (const key of Object.keys(api)) {
        result[key] = decorate(api[key], key);
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
        headers: RequestInfo,
        processor: Processor<TStatePrivate, any, any>,
        processorName: string,
        arg: unknown
    ) => Promise<void>
): MapApiState<TApi, TStatePublic> {
    return decorateApi<TStatePrivate, TStatePublic, TApi>(
        api,
        (processor, processorName) => {
            async function work(
                state: TStatePublic,
                req: unknown,
                headers: RequestInfo
            ) {
                const signal = new Deferred<any>();
                middleware(
                    async newState => {
                        if (processor.type === 'handler') {
                            const result = await processor.handle(
                                newState,
                                req,
                                headers
                            );
                            signal.resolve(result);
                        } else if (processor.type === 'streamer') {
                            const result = processor.stream(
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
                    headers,
                    processor,
                    processorName,
                    req
                ).catch(error => {
                    if (signal.state !== 'pending') {
                        log.error(error, 'middleware failed after next()');
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
                    handle: async (state, request, headers) => {
                        return work(state, request, headers);
                    },
                } satisfies Handler<TStatePublic, any, any>;
            } else if (processor.type === 'streamer') {
                return {
                    type: 'streamer',
                    req: processor.req,
                    item: processor.item,
                    stream: async function* (state, request, headers) {
                        yield* await work(state, request, headers);
                    },
                } satisfies Streamer<TStatePublic, any, any>;
            } else {
                assertNever(processor);
            }
        }
    );
}

export type InferRpcClient<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Streamer<any, infer TReq, infer TItem>
        ? (req: TReq, headers?: MessageHeaders) => Stream<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (req: TReq, headers?: MessageHeaders) => Promise<TRes>
          : never;
};

export type InferRpcClientWithRequiredHeaders<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Streamer<any, infer TReq, infer TItem>
        ? (req: TReq, headers: MessageHeaders) => Stream<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (req: TReq, headers: MessageHeaders) => Promise<TRes>
          : never;
};

export class RpcServer<TState> {
    constructor(
        private readonly transport: TransportServer<Message>,
        private readonly api: Api<TState>,
        private readonly state: TState,
        private readonly serverName: string
    ) {}

    async launch(): Promise<void> {
        await this.transport.launch(conn => this.handleConnection(conn));
    }

    close() {
        this.transport.close();
    }

    private handleConnection(conn: Connection<Message>): void {
        launchRpcStreamerServer(this.api, this.state, conn, this.serverName);
    }
}

export {
    createRpcStreamerClient as createRpcClient,
    launchRpcStreamerServer as launchRpcServer,
} from './rpc-streamer.js';

export function getRequiredProcessor<T, K extends keyof T>(
    api: T,
    name: K
): T[K] {
    const value = api[name];
    if (value === undefined) {
        throw new BusinessError(
            `unknown processor ${String(name)}`,
            'unknown_processor'
        );
    }
    return value;
}
