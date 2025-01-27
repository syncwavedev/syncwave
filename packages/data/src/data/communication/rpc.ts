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
    handle(state: TState, request: TRequest, cx: Context): Promise<TResponse>;
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
        state: TState,
        request: TypeOf<TRequestSchema>,
        cx: Context
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
        state: TState,
        request: TypeOf<TRequestSchema>,
        cx: Context
    ) {
        request = options.req.parse(request);
        const res = await options.handle(state, request, cx);
        return options.res.parse(res);
    }

    return {
        type: 'handler' as const,
        handle: wrapper,
    };
}

export interface Streamer<TState, TRequest, TItem> {
    type: 'streamer';
    stream(state: TState, req: TRequest, cx: Context): AsyncIterable<TItem>;
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
        state: TState,
        req: TypeOf<TRequestSchema>,
        cx: Context
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
        state: TState,
        req: TypeOf<TRequestSchema>,
        cx: Context
    ): AsyncIterable<TypeOf<TItemSchema>> {
        req = options.req.parse(req);
        for await (const item of options.stream(state, req, cx)) {
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
    map: (state: TStatePublic) => TStatePrivate | Promise<TStatePrivate>
): ChangeApiState<TApi, TStatePublic> {
    return applyMiddleware(api, async (next, state) => await next(map(state)));
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
        next: (state: TStatePrivate) => Promise<void>,
        state: TStatePublic,
        cx: Context
    ) => Promise<void>
): ChangeApiState<TApi, TStatePublic> {
    return decorateApi<TStatePrivate, TStatePublic, TApi>(api, processor => {
        async function work(
            state: TStatePublic,
            request: unknown,
            cx: Context
        ) {
            const signal = new Deferred<any>();
            middleware(
                async (newState: TStatePrivate) => {
                    if (processor.type === 'handler') {
                        const result = await processor.handle(
                            newState,
                            request,
                            cx
                        );
                        signal.resolve(result);
                    } else if (processor.type === 'streamer') {
                        const result = processor.stream(newState, request, cx);
                        signal.resolve(result);
                    } else {
                        assertNever(processor);
                    }
                },
                state,
                cx
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

        const timeoutCxs = new CancellationSource();
        const subscribeCxs = new CancellationSource();
        const unsub = () => subscribeCxs.cancel();

        conn.subscribe(
            {
                next: async msg => {
                    if (
                        msg.type !== 'response' ||
                        msg.requestId !== requestId
                    ) {
                        return;
                    }

                    timeoutCxs.cancel();

                    if (msg.payload.type === 'error') {
                        if (state === 'pending') {
                            await exe.throw(
                                new Error("got 'error' before start")
                            );
                        }
                        await exe.throw(
                            new Error(
                                'rpc call failed: ' +
                                    (msg.payload.message ?? '<no message>')
                            )
                        );
                        unsub();
                    } else if (msg.payload.type === 'success') {
                        await exe.throw(
                            new Error("unexpected 'success' message for stream")
                        );
                        unsub();
                    } else if (msg.payload.type === 'item') {
                        if (state !== 'open') {
                            await exe.throw(
                                new Error("got 'item' in " + state)
                            );
                            unsub();
                            return;
                        }
                        const itemId = msg.id;
                        await exe.next(msg.payload.item);

                        await conn.send({
                            id: createMessageId(),
                            type: 'ack',
                            headers: getHeaders(),
                            itemId,
                        });
                    } else if (msg.payload.type === 'end') {
                        if (state !== 'open') {
                            await exe.throw(new Error("got 'end' in " + state));
                            unsub();
                            return;
                        }
                        state = 'end';
                        exe.end();
                        unsub();
                    } else if (msg.payload.type === 'start') {
                        if (state !== 'pending') {
                            await exe.throw(new Error('stream started twice'));
                            unsub();
                            return;
                        } else {
                            state = 'open';
                        }
                    } else {
                        assertNever(msg.payload);
                    }
                },
                throw: async error => {
                    timeoutCxs.cancel();
                    await exe.throw(error);
                    state = 'end';
                    unsub();
                },
                close: async () => {
                    timeoutCxs.cancel();
                    state = 'end';
                    await exe.throw(
                        new Error('lost connection to rpc server lost')
                    );
                    unsub();
                },
            },
            subscribeCxs.cancellation
        );

        try {
            await conn.send({
                id: requestId,
                type: 'request',
                headers: getHeaders(),
                payload: {name, arg},
            });
        } catch (error) {
            await exe.throw(error);
            unsub();
        }

        wait(RPC_CALL_TIMEOUT_MS, timeoutCxs.cancellation)
            .then(async () => {
                if (state === 'pending') {
                    await exe.throw(
                        new Error('stream failed to start: timeout')
                    );
                    unsub();
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
            unsub();
            timeoutCxs.cancel();
            const promises: Promise<void>[] = [
                exe.throw(new CancelledError('cancellation requested')),
            ];
            if (state !== 'end') {
                promises.push(
                    conn.send({
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

    async function listenHandler(name: string, arg: any, cx: Context) {
        const result = new Deferred<any>();
        const requestId = createMessageId();
        const timeoutCxs = new CancellationSource();
        const subscribeCxs = new CancellationSource();
        const unsub = () => subscribeCxs.cancel();

        conn.subscribe(
            {
                next: async msg => {
                    if (
                        !(
                            msg.type === 'response' &&
                            msg.requestId === requestId
                        )
                    ) {
                        return;
                    }
                    timeoutCxs.cancel();
                    if (msg.payload.type === 'error') {
                        result.reject(
                            new Error(
                                'rpc call failed: ' +
                                    (msg.payload.message ?? '<no message>')
                            )
                        );
                        unsub();
                    } else if (msg.payload.type === 'success') {
                        result.resolve(msg.payload.result);
                        unsub();
                    } else if (msg.payload.type === 'item') {
                        result.reject(
                            new Error("unexpected 'item' message for handler")
                        );
                        unsub();
                    } else if (msg.payload.type === 'end') {
                        result.reject(
                            new Error("unexpected 'end' message for handler")
                        );
                        unsub();
                    } else if (msg.payload.type === 'start') {
                        result.reject(
                            new Error("unexpected 'start' message for handler")
                        );
                        unsub();
                    } else {
                        assertNever(msg.payload);
                    }
                },
                throw: async error => {
                    timeoutCxs.cancel();
                    result.reject(error);
                    unsub();
                },
                close: async () => {
                    timeoutCxs.cancel();
                    result.reject(new Error('lost connection to rpc server'));
                    unsub();
                },
            },
            subscribeCxs.cancellation
        );

        wait(RPC_CALL_TIMEOUT_MS, timeoutCxs.cancellation)
            .then(() => {
                if (result.state === 'pending') {
                    result.reject(new Error('rpc call failed: timeout'));
                    unsub();
                }
            })
            .catch(err => {
                console.error('unexpected error after rpc timed out', err);
            });

        try {
            await conn.send({
                id: requestId,
                type: 'request',
                headers: getHeaders(),
                payload: {name, arg},
            });

            cx.cleanup(() => {
                unsub();
                timeoutCxs.cancel();
                result.reject(new Error('handler cancellation requested'));
            });

            return await result.promise;
        } finally {
            unsub();
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

        return (arg: any, requestCtx: Context) => {
            if (processor.type === 'handler') {
                return listenHandler(name, arg, requestCtx);
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
        next: async message => {
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

    wait(timeoutMs, ctx)
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
        next: message => handleMessageServer(message),
        throw: async () => {
            await contextManager.cancelAll();
        },
        close: async () => {
            serverCancel;
        },
    });

    async function handleMessageServer(message: Message) {
        if (message.type === 'request') {
            await handleRequest(message);
        } else if (message.type === 'response') {
            // do nothing
        } else if (message.type === 'ack') {
            // nothing to do
        } else if (message.type === 'cancel') {
            contextManager.cancel(message.requestId);
        } else {
            assertNever(message);
        }
    }

    async function handleRequestHandler(
        handler: Handler<ProcessorContext<TState>, any, any>,
        msg: RequestMessage
    ) {
        contextManager.start(msg.id);
        const ctx = contextManager.context(msg.id);

        const result = await handler.handle(
            {message: msg, state},
            msg.payload.arg,
            ctx
        );
        await conn.send({
            id: createMessageId(),
            type: 'response',
            requestId: msg.id,
            payload: {type: 'success', result},
        });
    }

    async function handleRequestStreamer(
        processor: Streamer<ProcessorContext<TState>, any, any>,
        msg: RequestMessage
    ) {
        const requestId = msg.id;
        contextManager.start(requestId);
        try {
            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId,
                payload: {type: 'start'},
            });

            const ctx = contextManager.context(requestId);

            const processorStream = processor.stream(
                {message: msg, state},
                msg.payload.arg,
                ctx
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

                await conn.send({
                    id: itemMessageId,
                    type: 'response',
                    requestId,
                    payload: {type: 'item', item},
                });

                await ack;
            }

            if (contextManager.isRunning(requestId)) {
                await conn.send({
                    id: createMessageId(),
                    type: 'response',
                    requestId,
                    payload: {type: 'end'},
                });
            }
        } finally {
            contextManager.finish(requestId);
        }
    }

    async function handleRequest(msg: RequestMessage) {
        try {
            const processor = api[msg.payload.name];
            if (processor.type === 'handler') {
                await handleRequestHandler(processor, msg);
            } else if (processor.type === 'streamer') {
                await handleRequestStreamer(processor, msg);
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

            await conn.send({
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
