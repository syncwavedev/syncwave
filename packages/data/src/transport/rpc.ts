import {TypeOf, ZodType} from 'zod';
import {Cursor} from '../cursor.js';
import {Deferred} from '../deferred.js';
import {BusinessError} from '../errors.js';
import {log} from '../logger.js';
import {Observable, Stream} from '../stream.js';
import {Message, MessageHeaders} from '../transport/message.js';
import {Connection, TransportServer} from '../transport/transport.js';
import {assertNever} from '../utils.js';
import {launchRpcObserverServer} from './rpc-observer.js';

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
    ): AsyncIterable<TItem>;
}

export interface Observer<TState, TRequest, TValue, TUpdate> {
    type: 'observer';
    req: ZodType<TRequest>;
    value: ZodType<TValue>;
    update: ZodType<TUpdate>;
    observe(
        state: TState,
        req: TRequest,
        headers: MessageHeaders
    ): Observable<TValue, TUpdate>;
}

export type Processor<TState, TRequest, TResult, TUpdate> =
    | Handler<TState, TRequest, TResult>
    | Streamer<TState, TRequest, TResult>
    | Observer<TState, TRequest, TResult, TUpdate>;

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
        const res = await options.handle(state, req, headers);
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
        for await (const item of options.stream(state, req, headers)) {
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

export type ObserverRequestSchema<T extends Observer<any, any, any, any>> =
    T extends Observer<any, infer R, any, any> ? R : never;

export type ObserverItemSchema<T extends Observer<any, any, any, any>> =
    T extends Observer<any, any, infer R, any> ? R : never;

export type ObserverUpdateSchema<T extends Observer<any, any, any, any>> =
    T extends Observer<any, any, any, infer R> ? R : never;

export interface ObserverOptions<
    TState,
    TRequestSchema extends ZodType<any, any, any>,
    TValueSchema extends ZodType<any, any, any>,
    TUpdateSchema extends ZodType<any, any, any>,
> {
    req: TRequestSchema;
    value: TValueSchema;
    update: TUpdateSchema;
    observe: (
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ) => Observable<TypeOf<TValueSchema>, TypeOf<TUpdateSchema>>;
}

export function observer<
    TState,
    TRequestSchema extends ZodType<any, any, any>,
    TValueSchema extends ZodType<any, any, any>,
    TUpdateSchema extends ZodType<any, any, any>,
>(
    options: ObserverOptions<
        TState,
        TRequestSchema,
        TValueSchema,
        TUpdateSchema
    >
): Observer<
    TState,
    TypeOf<TRequestSchema>,
    TypeOf<TValueSchema>,
    TypeOf<TUpdateSchema>
> {
    async function wrapper(
        state: TState,
        req: TypeOf<TRequestSchema>,
        headers: MessageHeaders
    ): Observable<TypeOf<TValueSchema>, TypeOf<TUpdateSchema>> {
        req = options.req.parse(req);
        const [value, update$] = await options.observe(state, req, headers);
        options.value.parse(value);

        return [value, update$.map(x => options.update.parse(x))];
    }

    return {
        type: 'observer' as const,
        req: options.req,
        value: options.value,
        update: options.update,
        observe: wrapper,
    };
}

export type Api<TState> = Record<string, Processor<TState, any, any, any>>;

export function createApi<TState>(): <T extends Api<TState>>(def: T) => T {
    return def => def;
}

type MapApiState<TApi extends Api<any>, TNewState> = {
    [K in keyof TApi]: MapProcessorState<TApi[K], TNewState>;
};

export type MapProcessorState<
    TProcessor extends Processor<any, any, any, any>,
    TNewState,
> =
    TProcessor extends Observer<any, infer R, infer V, infer U>
        ? Observer<TNewState, R, V, U>
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
    return applyMiddleware(api, async (next, state) => await next(map(state)));
}

export function decorateApi<
    TStatePrivate,
    TStatePublic,
    TApi extends Api<TStatePrivate>,
>(
    api: TApi,
    decorate: (
        processor: Processor<TStatePrivate, unknown, unknown, unknown>,
        processorName: string
    ) => Processor<TStatePublic, unknown, unknown, unknown>
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
        headers: MessageHeaders,
        processor: Processor<TStatePrivate, any, any, any>,
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
                headers: MessageHeaders
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
                        } else if (processor.type === 'observer') {
                            const result = await processor.observe(
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
                        log.error('middleware failed after next()', error);
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
                    observer: processor.observer,
                    stream: async function* (state, request, headers) {
                        yield* await work(state, request, headers);
                    },
                } satisfies Streamer<TStatePublic, any, any>;
            } else if (processor.type === 'observer') {
                return {
                    type: 'observer',
                    req: processor.req,
                    value: processor.value,
                    update: processor.update,
                    observe: async function (state, request, headers) {
                        return work(state, request, headers);
                    },
                } satisfies Observer<TStatePublic, any, any, any>;
            } else {
                assertNever(processor);
            }
        }
    );
}

export type InferRpcClient<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Observer<
        any,
        infer TReq,
        infer TValue,
        infer TUpdate
    >
        ? (
              req: TReq,
              headers?: MessageHeaders
          ) => Promise<[initialValue: TValue, Cursor<TUpdate>]>
        : T[K] extends Streamer<any, infer TReq, infer TItem>
          ? (req: TReq, headers?: MessageHeaders) => Stream<TItem>
          : T[K] extends Handler<any, infer TReq, infer TRes>
            ? (req: TReq, headers?: MessageHeaders) => Promise<TRes>
            : never;
};

export type InferRpcClientWithRequiredHeaders<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Observer<
        any,
        infer TReq,
        infer TValue,
        infer TUpdate
    >
        ? (
              req: TReq,
              headers: MessageHeaders
          ) => Promise<[initialValue: TValue, Cursor<TUpdate>]>
        : T[K] extends Streamer<any, infer TReq, infer TItem>
          ? (req: TReq, headers: MessageHeaders) => Stream<TItem>
          : T[K] extends Handler<any, infer TReq, infer TRes>
            ? (req: TReq, headers: MessageHeaders) => Promise<TRes>
            : never;
};

export class RpcServer<TState> {
    constructor(
        private readonly transport: TransportServer<Message>,
        private readonly api: Api<TState>,
        private readonly state: TState
    ) {}

    async launch(): Promise<void> {
        await this.transport.launch(conn => this.handleConnection(conn));
    }

    close() {
        this.transport.close();
    }

    private handleConnection(conn: Connection<Message>): void {
        launchRpcObserverServer(this.api, this.state, conn);
    }
}

export {
    createRpcObserverClient as createRpcClient,
    launchRpcObserverServer,
} from './rpc-observer.js';

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
