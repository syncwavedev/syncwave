import {
    astream,
    AsyncStream,
    ColdStream,
    ColdStreamExecutor,
    StreamPuppet,
} from '../../async-stream.js';
import {RPC_ACK_TIMEOUT_MS, RPC_CALL_TIMEOUT_MS} from '../../constants.js';
import {ContextManager} from '../../context-manager.js';
import {CancelledError, Context} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {BusinessError, getReadableError} from '../../errors.js';
import {
    assertNever,
    ignoreCancel,
    isCancelledError,
    wait,
    whenAll,
} from '../../utils.js';
import {
    createMessageId,
    Message,
    MessageHeaders,
    MessageId,
    RequestMessage,
    ResponsePayload,
} from '../communication/message.js';
import {Connection, TransportServer} from '../communication/transport.js';
import {
    Api,
    Handler,
    InferRpcClient,
    ObserverItem,
    Processor,
    Streamer,
} from './rpc.js';

async function proxyStreamerCall(
    listenCtx: Context,
    conn: Connection<Message>,
    exe: ColdStreamExecutor<any>,
    name: string,
    arg: any,
    headers: MessageHeaders
) {
    const requestId = createMessageId();

    let state: 'pending' | 'open' | 'complete' = 'pending';

    const [ctx, cancelCtx] = listenCtx.withCancel();
    const [timeoutCtx, cancelTimeout] = ctx.withCancel();

    ctx.onCancel(() => {
        if (state !== 'complete') {
            cancel(Context.todo(), 'cancelled').catch(error => {
                console.error('[ERR] proxyStreamerCall ctx.onCancel', error);
            });
        }
    });

    async function complete(ctx: Context) {
        state = 'complete';
        cancelCtx();
        exe.end(ctx);
    }

    async function cancel(ctx: Context, err: unknown) {
        state = 'complete';
        cancelCtx();
        await whenAll([
            conn.send(listenCtx, {
                id: createMessageId(),
                type: 'cancel',
                requestId,
                headers: {},
            }),
            exe
                .throw(ctx, typeof err === 'string' ? new Error(err) : err)
                .then(() => exe.end(ctx)),
        ]);
    }

    conn.subscribe(ctx, {
        next: async (ctx, msg) => {
            if (msg.type !== 'response' || msg.requestId !== requestId) {
                return;
            }

            function open() {
                state = 'open';
                cancelTimeout();
            }

            async function cancelInvalid(error: string) {
                console.error('[ERR] rpc protocol violation', error);
                await cancel(ctx, error);
            }

            async function acknowledge() {
                await conn.send(ctx, {
                    id: createMessageId(),
                    type: 'ack',
                    headers,
                    itemId: msg.id,
                });
            }

            if (state === 'pending') {
                if (msg.payload.type === 'start') {
                    open();
                } else {
                    const error = `got '${msg.payload.type}' for pending stream`;
                    await cancelInvalid(error);
                }
            } else if (state === 'open') {
                if (msg.payload.type === 'item') {
                    await exe.next(ctx, msg.payload.item);
                    await acknowledge();
                } else if (msg.payload.type === 'error') {
                    await exe.throw(
                        ctx,
                        new Error('rpc error: ' + msg.payload.message)
                    );
                    await acknowledge();
                } else if (msg.payload.type === 'end') {
                    await complete(ctx);
                } else {
                    const error = `got '${msg.payload.type}' for open stream`;
                    await cancelInvalid(error);
                }
            } else if (state === 'complete') {
                const error = `got '${msg.payload.type}' for open stream`;
                await cancelInvalid(error);
            } else {
                assertNever(state);
            }
        },
        throw: async (ctx, error) => {
            await cancel(ctx, error);
        },
        close: async ctx => {
            await cancel(ctx, 'lost connection to rpc server');
        },
    });

    try {
        await conn.send(listenCtx, {
            id: requestId,
            type: 'request',
            headers,
            payload: {name, arg},
        });
    } catch (error) {
        await cancel(ctx, error);
    }

    ignoreCancel(wait(timeoutCtx, RPC_CALL_TIMEOUT_MS))
        .then(async () => {
            await cancel(Context.todo(), 'stream failed to start');
        })
        .catch(err => {
            console.error('unexpected error after rpc timed out', err);
        });
}

async function proxyHandlerCall(
    parentCtx: Context,
    conn: Connection<Message>,
    name: string,
    arg: unknown,
    headers: MessageHeaders
) {
    const [ctx, cancel] = parentCtx.withCancel();

    try {
        const requestId = createMessageId();
        const result = new Deferred<any>();
        ctx.onCancel(() => {
            result.reject(new Error('handler cancellation requested'));
        });

        // wait for the response
        conn.subscribe(ctx, {
            next: async (ctx, msg) => {
                if (!(msg.type === 'response' && msg.requestId === requestId)) {
                    return;
                }

                try {
                    if (msg.payload.type === 'error') {
                        result.reject(
                            new Error(`rpc call failed: ${msg.payload.message}`)
                        );
                    } else if (msg.payload.type === 'success') {
                        result.resolve(msg.payload.result);
                    } else {
                        result.reject(
                            new Error(`got '${msg.payload.type}' for handler`)
                        );
                    }
                } finally {
                    cancel();
                }
            },
            throw: async error => {
                cancel();
                result.reject(error);
            },
            close: async () => {
                cancel();
                result.reject(new Error('lost connection to rpc server'));
            },
        });

        ignoreCancel(wait(ctx, RPC_CALL_TIMEOUT_MS))
            .then(() => {
                if (result.state === 'pending') {
                    result.reject(new Error('rpc call failed: timeout'));
                    cancel();
                }
            })
            .catch(err => {
                console.error('unexpected error after rpc timed out', err);
            });

        await conn.send(ctx, {
            id: requestId,
            type: 'request',
            headers,
            payload: {name, arg},
        });

        return await result.promise;
    } finally {
        cancel();
    }
}

function createProcessorProxy(
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders,
    processor: Processor<any, any, any>,
    name: string
) {
    return (ctx: Context, arg: unknown, headers?: MessageHeaders) => {
        if (processor.type === 'handler') {
            return proxyHandlerCall(
                ctx,
                conn,
                name,
                arg,
                Object.assign({}, getHeaders(), headers ?? {})
            );
        } else if (processor.type === 'streamer') {
            const coldStream = new ColdStream<any>(ctx, (ctx, exe) => {
                proxyStreamerCall(
                    ctx,
                    conn,
                    exe,
                    name,
                    arg,
                    Object.assign({}, getHeaders(), headers ?? {})
                ).catch(error => exe.throw(ctx, error));
            });

            if (processor.observer) {
                const result = new Deferred<
                    [initialValue: unknown, AsyncStream<unknown>]
                >();
                const updateStream = new StreamPuppet<any>(ctx);
                (async () => {
                    const observerStream: AsyncIterable<ObserverItem<any>> =
                        coldStream;

                    try {
                        for await (const item of observerStream) {
                            if (item.type === 'start') {
                                result.resolve([
                                    item.initialValue,
                                    astream(updateStream),
                                ]);
                            } else if (item.type === 'next') {
                                await updateStream.next(item.value);
                            } else {
                                assertNever(item);
                            }
                        }
                    } catch (error) {
                        result.reject(error);
                        await updateStream.throw(error);
                    } finally {
                        updateStream.end();
                    }
                })()
                    .catch(error => {
                        console.error(
                            '[ERR] createProcessorProxy observer',
                            error
                        );
                        result.reject(error);
                        return updateStream.throw(error);
                    })
                    .finally(() => {
                        result.reject(new CancelledError());
                        updateStream.end();
                    });

                return result.promise;
            } else {
                return astream(coldStream);
            }
        } else {
            assertNever(processor);
        }
    };
}

export function createRpcClient<TApi extends Api<any>>(
    api: TApi,
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders
): InferRpcClient<TApi> {
    function get(_target: unknown, nameOrSymbol: string | symbol) {
        if (typeof nameOrSymbol !== 'string') {
            throw new Error('rpc client supports only string methods');
        }
        const name = nameOrSymbol;

        const processor = api[name];
        if (!processor) {
            throw new Error(`unknown rpc endpoint: ${name}`);
        }

        return createProcessorProxy(conn, getHeaders, processor, name);
    }

    return new Proxy<any>({}, {get});
}

async function waitMessage<S extends Message>(
    parentCtx: Context,
    conn: Connection<Message>,
    predicate: (msg: Message) => msg is S,
    timeoutMs: number
): Promise<S | undefined>;
async function waitMessage(
    parentCtx: Context,
    conn: Connection<Message>,
    predicate: (msg: Message) => boolean,
    timeoutMs: number
): Promise<Message | undefined>;
async function waitMessage<S extends Message>(
    parentCtx: Context,
    conn: Connection<Message>,
    predicate: ((msg: Message) => msg is Message) | ((msg: Message) => boolean),
    timeoutMs: number
): Promise<S | undefined> {
    const result = new Deferred<S | undefined>();
    const [ctx, cancelCtx] = parentCtx.withCancel();
    conn.subscribe(ctx, {
        next: async (ctx, msg) => {
            if (predicate(msg)) {
                result.resolve(msg as any);
                cancelCtx();
            }
        },
        throw: async error => {
            result.reject(error);
            cancelCtx();
        },
        close: async () => {
            result.resolve(undefined);
            cancelCtx();
        },
    });

    ignoreCancel(wait(ctx, timeoutMs))
        .then(() => {
            if (result.state === 'pending') {
                result.reject(new Error(`stream timeout after ${timeoutMs}`));
            }
            cancelCtx();
        })
        .catch(err => {
            console.error('unexpected error after timed out', err);
        });

    return await result.promise;
}

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

    async close() {
        await this.transport.close();
    }

    private handleConnection(conn: Connection<Message>): void {
        setupRpcServerConnection(
            Context.todo(),
            this.api,
            conn,
            this.state,
            this.serverName
        );
    }
}

async function handleRequestStreamer<TState>(
    ctx: Context,
    conn: Connection<Message>,
    processor: Streamer<TState, any, any>,
    msg: RequestMessage,
    state: TState,
    serverName: string
) {
    const requestId = msg.id;

    try {
        await conn.send(ctx, {
            id: createMessageId(),
            type: 'response',
            requestId,
            payload: {type: 'start'},
            headers: {},
        });

        const processorStream = astream(
            processor.stream(ctx, state, msg.payload.arg, msg.headers)
        )
            .map((ctx, value) => ({type: 'next' as const, value}))
            .catch((ctx, error) => ({type: 'error' as const, error}));
        for await (const item of processorStream) {
            if (!ctx.alive) {
                break;
            }

            const itemMessageId = createMessageId();

            // we must subscribe for an ack before sending the message
            const ack = waitMessage(
                ctx,
                conn,
                msg => msg.type === 'ack' && msg.itemId === itemMessageId,
                RPC_ACK_TIMEOUT_MS
            );

            let payload: ResponsePayload;
            if (item.type === 'next') {
                payload = {type: 'item', item: item.value};
            } else if (item.type === 'error') {
                logRpcError(ctx, item.error, msg.payload.name, serverName);

                payload = {
                    type: 'error',
                    message: getReadableError(item.error),
                };
            } else {
                assertNever(item);
            }

            await conn.send(ctx, {
                id: itemMessageId,
                type: 'response',
                requestId,
                payload,
                headers: {},
            });

            await ack;
        }
    } finally {
        if (ctx.alive) {
            await conn.send(ctx, {
                id: createMessageId(),
                type: 'response',
                requestId,
                payload: {type: 'end'},
                headers: {},
            });
        }
    }
}

async function handleRequestHandler<TState>(
    ctx: Context,
    conn: Connection<Message>,
    handler: Handler<TState, any, any>,
    msg: RequestMessage,
    state: TState
) {
    const result = await handler.handle(
        ctx,
        state,
        msg.payload.arg,
        msg.headers
    );
    await conn.send(ctx, {
        id: createMessageId(),
        type: 'response',
        requestId: msg.id,
        payload: {type: 'success', result},
        headers: {},
    });
}

async function handleRequest<TState>(
    ctx: Context,
    conn: Connection<Message>,
    msg: RequestMessage,
    api: Api<TState>,
    state: TState,
    serverName: string
) {
    try {
        const processor = api[msg.payload.name];
        if (processor.type === 'handler') {
            await handleRequestHandler(ctx, conn, processor, msg, state);
        } else if (processor.type === 'streamer') {
            await handleRequestStreamer(
                ctx,
                conn,
                processor,
                msg,
                state,
                serverName
            );
        } else {
            assertNever(processor);
        }
    } catch (err: any) {
        logRpcError(ctx, err, msg.payload.name, serverName);

        await conn.send(ctx, {
            id: createMessageId(),
            type: 'response',
            requestId: msg.id,
            payload: {
                type: 'error',
                message: getReadableError(err),
            },
            headers: {},
        });
    }
}

function logRpcError(
    ctx: Context,
    err: unknown,
    procedureName: string,
    serverName: string
) {
    if (isCancelledError(err) && !ctx.alive) {
        console.warn(
            `[WRN] [${serverName}] cancel during ${procedureName} RPC request`
        );
    } else if (err instanceof BusinessError) {
        console.warn(
            `[WRN] [${serverName}] error during ${procedureName} RPC request:`,
            getReadableError(err)
        );
    } else {
        console.error(
            `[ERR] [${serverName}] error during ${procedureName} RPC request:`,
            err
        );
    }
}

export function setupRpcServerConnection<TState>(
    connectionCtx: Context,
    api: Api<TState>,
    conn: Connection<Message>,
    state: TState,
    serverName: string
): void {
    // we use requestId as stream id
    const [serverCtx, serverCancel] = connectionCtx.withCancel();
    const contextManager = new ContextManager<MessageId>(serverCtx);

    conn.subscribe(serverCtx, {
        next: async (ctx, message) => {
            if (message.type === 'request') {
                try {
                    const requestCtx = contextManager.start(message.id);
                    await handleRequest(
                        requestCtx,
                        conn,
                        message,
                        api,
                        state,
                        serverName
                    );
                } finally {
                    contextManager.finish(message.id);
                }
            } else if (message.type === 'response') {
                // do nothing
            } else if (message.type === 'ack') {
                // nothing to do
            } else if (message.type === 'cancel') {
                contextManager.cancel(message.requestId);
            } else {
                assertNever(message);
            }
        },
        throw: async () => {
            contextManager.finishAll();
        },
        close: async () => {
            serverCancel();
        },
    });
}
