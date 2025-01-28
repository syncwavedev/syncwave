import {astream, ColdStream, ColdStreamExecutor} from '../../async-stream.js';
import {RPC_ACK_TIMEOUT_MS, RPC_CALL_TIMEOUT_MS} from '../../constants.js';
import {ContextManager} from '../../context-manager.js';
import {Context} from '../../context.js';
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
} from '../communication/message.js';
import {Connection, TransportServer} from '../communication/transport.js';
import {
    Api,
    Handler,
    InferRpcClient,
    ProcessorContext,
    Streamer,
} from './rpc.js';

async function proxyStreamerCall(
    listenCtx: Context,
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders,
    exe: ColdStreamExecutor<any>,
    name: string,
    arg: any
) {
    const requestId = createMessageId();

    let state: 'pending' | 'open' | 'complete' | 'invalid' = 'pending';

    const [ctx, cancel] = listenCtx.withCancel();
    const [timeoutCtx, cancelTimeout] = ctx.withCancel();

    ctx.cleanup(async () => {
        console.log('state: ', state);
        if (state !== 'complete') {
            await toCancelled(Context.todo(), 'cancelled');
        }
    });

    async function toCompleted(ctx: Context) {
        state = 'complete';
        await exe.end(ctx);
        await cancel();
    }

    async function toCancelled(ctx: Context, error: string) {
        state = 'complete';
        await whenAll([
            conn.send(listenCtx, {
                id: createMessageId(),
                type: 'cancel',
                requestId,
                headers: {},
            }),
            exe.throw(ctx, new Error(error)).then(() => exe.end(ctx)),
        ]);
    }

    conn.subscribe(ctx, {
        next: async (ctx, msg) => {
            if (msg.type !== 'response' || msg.requestId !== requestId) {
                return;
            }

            async function toOpened() {
                state = 'open';
                await cancelTimeout();
            }

            async function toInvalid(error: string) {
                console.error('[ERR] rpc protocol violation', error);
                state = 'invalid';
                await exe.throw(ctx, new Error(error));
                await cancel();
            }

            async function sendAck() {
                await conn.send(ctx, {
                    id: createMessageId(),
                    type: 'ack',
                    headers: getHeaders(),
                    itemId: msg.id,
                });
            }

            if (state === 'pending') {
                if (msg.payload.type === 'start') {
                    await toOpened();
                } else {
                    const error = `got '${msg.payload.type}' for pending stream`;
                    await toInvalid(error);
                }
            } else if (state === 'open') {
                if (msg.payload.type === 'item') {
                    await exe.next(ctx, msg.payload.item);
                    await sendAck();
                } else if (msg.payload.type === 'error') {
                    await exe.throw(
                        ctx,
                        new Error('rpc error: ' + msg.payload.message)
                    );
                    await sendAck();
                } else if (msg.payload.type === 'end') {
                    await toCompleted(ctx);
                } else {
                    const error = `got '${msg.payload.type}' for open stream`;
                    await toInvalid(error);
                }
            } else if (state === 'complete') {
                const error = `got '${msg.payload.type}' for open stream`;
                await toInvalid(error);
            } else if (state === 'invalid') {
                const error = `got '${msg.payload.type}' for invalid stream`;
                await toInvalid(error);
            } else {
                assertNever(state);
            }
        },
        throw: async (ctx, error) => {
            await exe.throw(ctx, error);
            await toCompleted(ctx);
        },
        close: async ctx => {
            state = 'complete';
            await exe.throw(
                ctx,
                new Error('lost connection to rpc server lost')
            );
            await cancel();
        },
    });

    try {
        await conn.send(listenCtx, {
            id: requestId,
            type: 'request',
            headers: getHeaders(),
            payload: {name, arg},
        });
    } catch (error) {
        await exe.throw(listenCtx, error);
        await cancel();
    }

    ignoreCancel(wait(timeoutCtx, RPC_CALL_TIMEOUT_MS))
        .then(async () => {
            await toCancelled(Context.todo(), 'stream failed to start');
        })
        .catch(err => {
            console.error('unexpected error after rpc timed out', err);
        });
}

async function proxyHandlerCall(
    parentCtx: Context,
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders,
    name: string,
    arg: unknown
) {
    const [ctx, cancel] = parentCtx.withCancel();

    try {
        const requestId = createMessageId();
        const result = new Deferred<any>();
        ctx.cleanup(() => {
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
                    await cancel();
                }
            },
            throw: async error => {
                await cancel();
                result.reject(error);
            },
            close: async () => {
                await cancel();
                result.reject(new Error('lost connection to rpc server'));
            },
        });

        ignoreCancel(wait(ctx, RPC_CALL_TIMEOUT_MS))
            .then(async () => {
                if (result.state === 'pending') {
                    result.reject(new Error('rpc call failed: timeout'));
                    await cancel();
                }
            })
            .catch(err => {
                console.error('unexpected error after rpc timed out', err);
            });

        await conn.send(ctx, {
            id: requestId,
            type: 'request',
            headers: getHeaders(),
            payload: {name, arg},
        });

        return await result.promise;
    } finally {
        await cancel();
    }
}

function createProcessorProxy(
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders,
    processor: Handler<any, any, any> | Streamer<any, any, any>,
    name: string
) {
    return (requestCtx: Context, arg: unknown) => {
        if (processor.type === 'handler') {
            return proxyHandlerCall(requestCtx, conn, getHeaders, name, arg);
        } else if (processor.type === 'streamer') {
            const coldStream = new ColdStream(
                requestCtx,
                (executorCtx, exe) => {
                    const [ctx, cancel] = executorCtx.withCancel();
                    proxyStreamerCall(
                        ctx,
                        conn,
                        getHeaders,
                        exe,
                        name,
                        arg
                    ).catch(error => exe.throw(ctx, error));

                    return cancel;
                }
            );
            return astream(coldStream);
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

    ignoreCancel(wait(ctx, timeoutMs))
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
    processor: Streamer<ProcessorContext<TState>, any, any>,
    msg: RequestMessage,
    state: TState
) {
    const requestId = msg.id;

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
    } finally {
        await conn.send(ctx, {
            id: createMessageId(),
            type: 'response',
            requestId,
            payload: {type: 'end'},
        });
    }
}

async function handleRequestHandler<TState>(
    ctx: Context,
    conn: Connection<Message>,
    handler: Handler<ProcessorContext<TState>, any, any>,
    msg: RequestMessage,
    state: TState
) {
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
}

async function handleRequest<TState>(
    ctx: Context,
    conn: Connection<Message>,
    msg: RequestMessage,
    api: Api<ProcessorContext<TState>>,
    state: TState,
    serverName: string
) {
    try {
        const processor = api[msg.payload.name];
        if (processor.type === 'handler') {
            await handleRequestHandler(ctx, conn, processor, msg, state);
        } else if (processor.type === 'streamer') {
            await handleRequestStreamer(ctx, conn, processor, msg, state);
        } else {
            assertNever(processor);
        }
    } catch (err: any) {
        if (isCancelledError(err) && !ctx.alive) {
            console.warn(
                `[WRN] [${serverName}] cancel during ${msg.payload.name} RPC request`
            );
        } else if (err instanceof BusinessError) {
            console.warn(
                `[WRN] [${serverName}] error during ${msg.payload.name} RPC request:`,
                getReadableError(err)
            );
        } else {
            console.error(
                `[ERR] [${serverName}] error during ${msg.payload.name} RPC request:`,
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

export function setupRpcServerConnection<TState>(
    connectionCtx: Context,
    api: Api<ProcessorContext<TState>>,
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
                    await contextManager.finish(message.id);
                }
            } else if (message.type === 'response') {
                // do nothing
            } else if (message.type === 'ack') {
                // nothing to do
            } else if (message.type === 'cancel') {
                await contextManager.cancel(message.requestId);
            } else {
                assertNever(message);
            }
        },
        throw: async () => {
            await contextManager.finishAll();
        },
        close: async () => {
            await serverCancel();
        },
    });
}
