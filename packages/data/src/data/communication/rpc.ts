import {TypeOf, ZodObject, ZodType} from 'zod';
import {
    astream,
    AsyncStream,
    ColdStream,
    ColdStreamExecutor,
} from '../../async-stream.js';
import {RPC_ACK_TIMEOUT_MS, RPC_CALL_TIMEOUT_MS} from '../../constants.js';
import {ContextManager} from '../../context-manager.js';
import {CancelledError, Context} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {BusinessError, getReadableError} from '../../errors.js';
import {assertNever, wait, whenAll} from '../../utils.js';
import {
    createMessageId,
    Message,
    MessageHeaders,
    MessageId,
    RequestMessage,
} from './message.js';
import {Connection, TransportServer} from './transport.js';

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

export function createRpcClient<TApi extends Api<any>>(
    api: TApi,
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders
): InferRpcClient<TApi> {
    async function listenStreamer(
        ctx: Context,
        exe: ColdStreamExecutor<any>,
        name: string,
        arg: any
    ) {
        const requestId = createMessageId();

        let state: 'pending' | 'open' | 'end' = 'pending';

        const [timeoutCtx, cancelTimeout] = Context.todo().withCancel();
        const [subscriptionCtx, cancelSubscription] =
            Context.todo().withCancel();

        conn.subscribe(subscriptionCtx, {
            next: async (ctx, msg) => {
                if (msg.type !== 'response' || msg.requestId !== requestId) {
                    return;
                }

                await cancelTimeout();

                if (msg.payload.type === 'error') {
                    if (state === 'pending') {
                        await exe.throw(
                            ctx,
                            new Error("got 'error' before start")
                        );
                    }
                    await exe.throw(
                        ctx,
                        new Error(
                            'rpc call failed: ' +
                                (msg.payload.message ?? '<no message>')
                        )
                    );
                    await cancelSubscription();
                } else if (msg.payload.type === 'success') {
                    await exe.throw(
                        ctx,
                        new Error("unexpected 'success' message for stream")
                    );
                    await cancelSubscription();
                } else if (msg.payload.type === 'item') {
                    if (state !== 'open') {
                        await exe.throw(
                            ctx,
                            new Error("got 'item' in " + state)
                        );
                        await cancelSubscription();
                        return;
                    }
                    const itemId = msg.id;
                    await exe.next(ctx, msg.payload.item);

                    await conn.send(ctx, {
                        id: createMessageId(),
                        type: 'ack',
                        headers: getHeaders(),
                        itemId,
                    });
                } else if (msg.payload.type === 'end') {
                    if (state !== 'open') {
                        await exe.throw(
                            ctx,
                            new Error("got 'end' in " + state)
                        );
                        await cancelSubscription();
                        return;
                    }
                    state = 'end';
                    await exe.end(ctx);
                    await cancelSubscription();
                } else if (msg.payload.type === 'start') {
                    if (state !== 'pending') {
                        await exe.throw(ctx, new Error('stream started twice'));
                        await cancelSubscription();
                        return;
                    } else {
                        state = 'open';
                    }
                } else {
                    assertNever(msg.payload);
                }
            },
            throw: async (ctx, error) => {
                await cancelTimeout();
                await exe.throw(ctx, error);
                state = 'end';
                await cancelSubscription();
            },
            close: async ctx => {
                await cancelTimeout();
                state = 'end';
                await exe.throw(
                    ctx,
                    new Error('lost connection to rpc server lost')
                );
                await cancelSubscription();
            },
        });

        try {
            await conn.send(ctx, {
                id: requestId,
                type: 'request',
                headers: getHeaders(),
                payload: {name, arg},
            });
        } catch (error) {
            await exe.throw(ctx, error);
            await cancelSubscription();
        }

        wait(timeoutCtx, RPC_CALL_TIMEOUT_MS)
            .then(async () => {
                if (state === 'pending') {
                    await exe.throw(
                        ctx,
                        new Error('stream failed to start: timeout')
                    );
                    await cancelSubscription();
                }
            })
            .catch(err => {
                console.error('unexpected error after rpc timed out', err);
            });

        // note: what happens when server dies
        // - server dies
        // - exe.throw('connection lost, reconnecting')
        // - conn.send in retry loop
        // - new server instance starts
        // - conn.send succeeds, but that stream doesn't exist on the new server
        // - noop
        ctx.cleanup(async () => {
            await cancelSubscription();
            await cancelTimeout();
            const promises: Promise<void>[] = [
                exe.throw(ctx, new CancelledError('cancellation requested')),
            ];
            if (state !== 'end') {
                promises.push(
                    conn.send(ctx, {
                        id: createMessageId(),
                        type: 'cancel',
                        requestId,
                        headers: {},
                    })
                );
            }
            await whenAll(promises);
        });
    }

    async function listenHandler(ctx: Context, name: string, arg: unknown) {
        const result = new Deferred<any>();
        const requestId = createMessageId();
        const [timeoutCtx, cancelTimeout] = Context.todo().withCancel();
        const [subscriptionCtx, cancelSubscription] =
            Context.todo().withCancel();

        conn.subscribe(subscriptionCtx, {
            next: async (ctx, msg) => {
                if (!(msg.type === 'response' && msg.requestId === requestId)) {
                    return;
                }
                await cancelTimeout();
                if (msg.payload.type === 'error') {
                    result.reject(
                        new Error(
                            'rpc call failed: ' +
                                (msg.payload.message ?? '<no message>')
                        )
                    );
                    await cancelSubscription();
                } else if (msg.payload.type === 'success') {
                    result.resolve(msg.payload.result);
                    await cancelSubscription();
                } else if (msg.payload.type === 'item') {
                    result.reject(
                        new Error("unexpected 'item' message for handler")
                    );
                    await cancelSubscription();
                } else if (msg.payload.type === 'end') {
                    result.reject(
                        new Error("unexpected 'end' message for handler")
                    );
                    await cancelSubscription();
                } else if (msg.payload.type === 'start') {
                    result.reject(
                        new Error("unexpected 'start' message for handler")
                    );
                    await cancelSubscription();
                } else {
                    assertNever(msg.payload);
                }
            },
            throw: async error => {
                await cancelTimeout();
                result.reject(error);
                await cancelSubscription();
            },
            close: async () => {
                await cancelTimeout();
                result.reject(new Error('lost connection to rpc server'));
                await cancelSubscription();
            },
        });

        wait(timeoutCtx, RPC_CALL_TIMEOUT_MS)
            .then(async () => {
                if (result.state === 'pending') {
                    result.reject(new Error('rpc call failed: timeout'));
                    await cancelSubscription();
                }
            })
            .catch(err => {
                console.error('unexpected error after rpc timed out', err);
            });

        try {
            await conn.send(ctx, {
                id: requestId,
                type: 'request',
                headers: getHeaders(),
                payload: {name, arg},
            });

            ctx.cleanup(async () => {
                await cancelSubscription();
                await cancelTimeout();
                result.reject(new Error('handler cancellation requested'));
            });

            return await result.promise;
        } finally {
            await cancelSubscription();
        }
    }

    function get(nameOrSymbol: string | symbol) {
        if (typeof nameOrSymbol !== 'string') {
            throw new Error('rpc client supports only string methods');
        }
        const name = nameOrSymbol;

        const processor = api[name];
        if (!processor) {
            throw new Error(`unknown rpc endpoint: ${name}`);
        }

        return (requestCtx: Context, arg: unknown) => {
            if (processor.type === 'handler') {
                return listenHandler(requestCtx, name, arg);
            } else if (processor.type === 'streamer') {
                return astream(
                    new ColdStream(requestCtx, (ctx, exe) => {
                        listenStreamer(ctx, exe, name, arg).catch(error =>
                            exe.throw(ctx, error)
                        );
                    })
                );
            } else {
                assertNever(processor);
            }
        };
    }

    return new Proxy<any>({}, {get: (_target, name) => get(name)});
}

export type Transact<TState> = <TResult>(
    message: RequestMessage,
    fn: (state: TState) => Promise<TResult>
) => Promise<TResult>;

export interface ProcessorContext<TState> {
    message: Message;
    state: TState;
}
async function waitMessage<S extends Message>(
    parentCtx: Context,
    conn: Connection<Message>,
    predicate: (message: Message) => message is S,
    timeoutMs: number
): Promise<S | undefined>;
async function waitMessage(
    parentCtx: Context,
    conn: Connection<Message>,
    predicate: (message: Message) => boolean,
    timeoutMs: number
): Promise<Message | undefined>;
async function waitMessage<S extends Message>(
    parentCtx: Context,
    conn: Connection<Message>,
    predicate:
        | ((message: Message) => message is Message)
        | ((message: Message) => boolean),
    timeoutMs: number
): Promise<S | undefined> {
    const result = new Deferred<S | undefined>();
    const [ctx, cancelCtx] = parentCtx.withCancel();
    conn.subscribe(ctx, {
        next: async (ctx, message) => {
            if (predicate(message)) {
                result.resolve(message as any);
                await cancelCtx();
            }
        },
        throw: async error => {
            result.reject(error);
            await cancelCtx();
        },
        close: async () => {
            result.resolve(undefined);
            await cancelCtx();
        },
    });

    wait(ctx, timeoutMs)
        .then(async () => {
            if (result.state === 'pending') {
                result.reject(new Error(`timeout after ${timeoutMs}`));
            }
            await cancelCtx();
        })
        .catch(err => {
            console.error('unexpected error after timed out', err);
        });

    return await result.promise;
}

export class RpcServer<TState> {
    constructor(
        private readonly transport: TransportServer<Message>,
        private readonly api: Api<ProcessorContext<TState>>,
        private readonly state: TState
    ) {}

    async launch(): Promise<void> {
        await this.transport.launch(conn => this.handleConnection(conn));
    }

    async close() {
        await this.transport.close();
    }

    private handleConnection(conn: Connection<Message>): void {
        setupRpcServerConnection(Context.todo(), this.api, conn, this.state);
    }
}

export function setupRpcServerConnection<TState>(
    connectionCtx: Context,
    api: Api<ProcessorContext<TState>>,
    conn: Connection<Message>,
    state: TState
): void {
    // we use requestId as stream id
    const [serverCtx, serverCancel] = connectionCtx.withCancel();
    const contextManager = new ContextManager<MessageId>(serverCtx);

    conn.subscribe(serverCtx, {
        next: (ctx, message) => handleMessageServer(ctx, message),
        throw: async () => {
            await contextManager.cancelAll();
        },
        close: async () => {
            serverCancel;
        },
    });

    async function handleMessageServer(ctx: Context, message: Message) {
        if (message.type === 'request') {
            await handleRequest(ctx, message);
        } else if (message.type === 'response') {
            // do nothing
        } else if (message.type === 'ack') {
            // nothing to do
        } else if (message.type === 'cancel') {
            await contextManager.cancel(message.requestId);
        } else {
            assertNever(message);
        }
    }

    async function handleRequestHandler(
        ctx: Context,
        handler: Handler<ProcessorContext<TState>, any, any>,
        msg: RequestMessage
    ) {
        try {
            const result = await handler.handle(
                ctx,
                {message: msg, state},
                msg.payload.arg
            );
            await conn.send(ctx, {
                id: createMessageId(),
                type: 'response',
                requestId: msg.id,
                payload: {type: 'success', result},
            });
        } finally {
            await contextManager.finish(msg.id);
        }
    }

    async function handleRequestStreamer(
        ctx: Context,
        processor: Streamer<ProcessorContext<TState>, any, any>,
        msg: RequestMessage
    ) {
        const requestId = msg.id;
        contextManager.start(requestId);
        try {
            await conn.send(ctx, {
                id: createMessageId(),
                type: 'response',
                requestId,
                payload: {type: 'start'},
            });

            const processorStream = processor.stream(
                ctx,
                {message: msg, state},
                msg.payload.arg
            );
            for await (const item of processorStream) {
                const itemMessageId = createMessageId();

                // we must subscribe for an ack before sending the message
                const ack = waitMessage(
                    ctx,
                    conn,
                    msg => msg.type === 'ack' && msg.itemId === itemMessageId,
                    RPC_ACK_TIMEOUT_MS
                );

                await conn.send(ctx, {
                    id: itemMessageId,
                    type: 'response',
                    requestId,
                    payload: {type: 'item', item},
                });

                await ack;
            }

            if (contextManager.isRunning(requestId)) {
                await conn.send(ctx, {
                    id: createMessageId(),
                    type: 'response',
                    requestId,
                    payload: {type: 'end'},
                });
            }
        } finally {
            await contextManager.finish(requestId);
        }
    }

    async function handleRequest(ctx: Context, msg: RequestMessage) {
        try {
            const processor = api[msg.payload.name];
            contextManager.start(msg.id);
            if (processor.type === 'handler') {
                await handleRequestHandler(
                    contextManager.context(msg.id),
                    processor,
                    msg
                );
            } else if (processor.type === 'streamer') {
                await handleRequestStreamer(
                    contextManager.context(msg.id),
                    processor,
                    msg
                );
            } else {
                assertNever(processor);
            }
        } catch (err: any) {
            if (err instanceof BusinessError) {
                console.warn(
                    `[WRN] error during ${msg.payload.name} RPC handle:`,
                    getReadableError(err)
                );
            } else {
                console.error(
                    `[ERR] error during ${msg.payload.name} RPC handle:`,
                    err
                );
            }

            await conn.send(ctx, {
                id: createMessageId(),
                type: 'response',
                requestId: msg.id,
                payload: {
                    type: 'error',
                    message: getReadableError(err),
                },
            });
        }
    }
}
