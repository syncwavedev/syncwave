import type {Tracer} from '@opentelemetry/api';
import {Deferred} from '../deferred.js';
import {BusinessError} from '../errors.js';
import {Stream} from '../stream.js';
import {checkValue, type ToSchema} from '../type.js';
import {assertNever} from '../utils.js';
import type {MessageHeaders, RpcMessageId} from './rpc-message.js';
import {launchRpcStreamerServer} from './rpc-streamer.js';
import {RpcTransportServer, type RpcConnection} from './rpc-transport.js';
import type {TransportServer} from './transport.js';

export interface Handler<TState, TRequest, TResponse> {
    type: 'handler';
    req: ToSchema<TRequest>;
    res: ToSchema<TResponse>;
    handle(state: TState, req: TRequest, ctx: RequestInfo): Promise<TResponse>;
}

export interface Streamer<TState, TRequest, TItem> {
    type: 'streamer';
    req: ToSchema<TRequest>;
    item: ToSchema<TItem>;
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
    requestId: RpcMessageId;
}

export interface HandlerOptions<TState, TRequest, TResponse> {
    req: ToSchema<TRequest>;
    res: ToSchema<TResponse>;
    handle: (
        state: TState,
        req: TRequest,
        ctx: RequestInfo
    ) => Promise<TResponse>;
}

export function handler<TState, TRequest, TResponse>(
    options: HandlerOptions<TState, TRequest, TResponse>
): Handler<TState, TRequest, TResponse> {
    async function wrapper(state: TState, req: TRequest, info: RequestInfo) {
        const res = await options.handle(
            state,
            checkValue(options.req, req),
            info
        );
        return checkValue(options.res, res);
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

export interface StreamerOptions<TState, TRequest, TItem> {
    req: ToSchema<TRequest>;
    item: ToSchema<TItem>;
    stream: (
        state: TState,
        req: TRequest,
        ctx: RequestInfo
    ) => AsyncIterable<TItem>;
}

export function streamer<TState, TRequest, TItem>(
    options: StreamerOptions<TState, TRequest, TItem>
): Streamer<TState, TRequest, TItem> {
    async function* wrapper(
        state: TState,
        req: TRequest,
        ctx: RequestInfo
    ): AsyncIterable<TItem> {
        for await (const item of options.stream(
            state,
            checkValue(options.req, req),
            ctx
        )) {
            yield checkValue(options.item, item);
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
                await middleware(
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
                );

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
        ? (req: TReq, headers?: Partial<MessageHeaders>) => Stream<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (req: TReq, headers?: Partial<MessageHeaders>) => Promise<TRes>
          : never;
} & {
    close(reason: unknown): void;
};

export type InferRpcClientWithRequiredHeaders<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Streamer<any, infer TReq, infer TItem>
        ? (req: TReq, headers: MessageHeaders) => Stream<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (req: TReq, headers: MessageHeaders) => Promise<TRes>
          : never;
} & {
    close(reason: unknown): void;
};

export class RpcServer<TState extends {close: (reason: unknown) => void}> {
    private readonly transport: RpcTransportServer;
    constructor(
        transport: TransportServer<unknown>,
        private readonly api: Api<TState>,
        private readonly state: TState,
        private readonly serverName: string,
        private readonly tracer: Tracer
    ) {
        this.transport = new RpcTransportServer(transport);
    }

    async launch(): Promise<void> {
        await this.transport.launch(conn => this.handleConnection(conn));
    }

    close(reason: unknown) {
        this.transport.close(reason);
        this.state.close(reason);
    }

    private handleConnection(conn: RpcConnection): void {
        launchRpcStreamerServer(
            this.api,
            this.state,
            conn,
            this.serverName,
            this.tracer
        );
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
