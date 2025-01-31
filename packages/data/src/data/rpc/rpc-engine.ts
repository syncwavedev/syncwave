import {
    astream,
    AsyncStream,
    ColdStream,
    ColdStreamExecutor,
    StreamPuppet,
} from '../../async-stream.js';
import {RPC_ACK_TIMEOUT_MS, RPC_CALL_TIMEOUT_MS} from '../../constants.js';
import {ContextManager} from '../../context-manager.js';
import {CancelledError, Cx} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {
    AppError,
    BusinessError,
    getReadableError,
    toError,
} from '../../errors.js';
import {logger} from '../../logger.js';
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
    parentCx: Cx,
    conn: Connection<Message>,
    exe: ColdStreamExecutor<any>,
    name: string,
    arg: any,
    headers: MessageHeaders
) {
    const requestId = createMessageId();

    let state: 'pending' | 'open' | 'complete' = 'pending';

    const [cx, cancelCx] = parentCx.withCancel();
    const [timeoutCx, cancelTimeout] = cx.withCancel();

    cx.onCancel(() => {
        if (state !== 'complete') {
            cancel(Cx.todo(), 'cancelled').catch(error => {
                logger.error(cx, 'proxyStreamerCall cx.onCancel', error);
            });
        }
    });

    async function complete(cx: Cx) {
        state = 'complete';
        cancelCx();
        exe.end();
    }

    async function cancel(cx: Cx, err: unknown) {
        state = 'complete';
        cancelCx();
        await whenAll(cx, [
            conn.send(parentCx, {
                id: createMessageId(),
                type: 'cancel',
                requestId,
                headers: {},
            }),
            exe.throw(toError(cx, err)).then(() => exe.end()),
        ]);
    }

    conn.subscribe(cx, {
        next: async (cx, msg) => {
            if (msg.type !== 'response' || msg.requestId !== requestId) {
                return;
            }

            function open(cx: Cx) {
                state = 'open';
                cancelTimeout();
            }

            async function cancelInvalid(cx: Cx, error: string) {
                logger.error(cx, 'rpc protocol violation', error);
                await cancel(cx, error);
            }

            async function acknowledge(cx: Cx) {
                await conn.send(cx, {
                    id: createMessageId(),
                    type: 'ack',
                    headers,
                    itemId: msg.id,
                });
            }

            if (state === 'pending') {
                if (msg.payload.type === 'start') {
                    open(cx);
                } else {
                    const error = `got '${msg.payload.type}' for pending stream`;
                    await cancelInvalid(cx, error);
                }
            } else if (state === 'open') {
                if (msg.payload.type === 'item') {
                    await exe.next(cx, msg.payload.item);
                    await acknowledge(cx);
                } else if (msg.payload.type === 'error') {
                    await exe.throw(
                        new AppError(cx, 'rpc error: ' + msg.payload.message)
                    );
                    await acknowledge(cx);
                } else if (msg.payload.type === 'end') {
                    await complete(cx);
                } else {
                    const error = `got '${msg.payload.type}' for open stream`;
                    await cancelInvalid(cx, error);
                }
            } else if (state === 'complete') {
                const error = `got '${msg.payload.type}' for open stream`;
                await cancelInvalid(cx, error);
            } else {
                assertNever(cx, state);
            }
        },
        throw: async error => {
            await cancel(Cx.todo(), error);
        },
        close: () => {
            cancel(Cx.todo(), 'lost connection to rpc server').catch(error => {
                logger.error(Cx.todo(), 'failed to close rpc server', error);
            });
        },
    });

    try {
        await conn.send(parentCx, {
            id: requestId,
            type: 'request',
            headers,
            payload: {name, arg},
        });
    } catch (error) {
        await cancel(cx, error);
    }

    ignoreCancel(wait(timeoutCx, RPC_CALL_TIMEOUT_MS))
        .then(async () => {
            await cancel(Cx.todo(), 'stream failed to start');
        })
        .catch(err => {
            logger.error(cx, 'unexpected error after rpc timed out', err);
        });
}

async function proxyHandlerCall(
    parentCx: Cx,
    conn: Connection<Message>,
    name: string,
    arg: unknown,
    headers: MessageHeaders
) {
    const [cx, cancel] = parentCx.withCancel();

    try {
        const requestId = createMessageId();
        const result = new Deferred<any>();
        cx.onCancel(() => {
            result.reject(new AppError(cx, 'handler cancellation requested'));
        });

        // wait for the response
        conn.subscribe(cx, {
            next: async (cx, msg) => {
                if (!(msg.type === 'response' && msg.requestId === requestId)) {
                    return;
                }

                try {
                    if (msg.payload.type === 'error') {
                        result.reject(
                            new AppError(
                                cx,
                                `rpc call failed: ${msg.payload.message}`
                            )
                        );
                    } else if (msg.payload.type === 'success') {
                        result.resolve(cx, msg.payload.result);
                    } else {
                        result.reject(
                            new AppError(
                                cx,
                                `got '${msg.payload.type}' for handler`
                            )
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
            close: () => {
                cancel();
                result.reject(
                    new AppError(cx, 'lost connection to rpc server')
                );
            },
        });

        ignoreCancel(wait(cx, RPC_CALL_TIMEOUT_MS))
            .then(() => {
                if (result.state === 'pending') {
                    result.reject(new AppError(cx, 'rpc call failed: timeout'));
                    cancel();
                }
            })
            .catch(err => {
                logger.error(cx, 'unexpected error after rpc timed out', err);
            });

        await conn.send(cx, {
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
    return (cx: Cx, arg: unknown, headers?: MessageHeaders) => {
        if (processor.type === 'handler') {
            return proxyHandlerCall(
                cx,
                conn,
                name,
                arg,
                Object.assign({}, getHeaders(), headers ?? {})
            );
        } else if (processor.type === 'streamer') {
            const coldStream = new ColdStream<any>(exe => {
                proxyStreamerCall(
                    cx,
                    conn,
                    exe,
                    name,
                    arg,
                    Object.assign({}, getHeaders(), headers ?? {})
                ).catch(error => exe.throw(error));

                return () => {
                    exe.throw(new CancelledError(Cx.todo())).finally(() =>
                        exe.end()
                    );
                };
            });

            if (processor.observer) {
                const result = new Deferred<
                    [initialValue: unknown, AsyncStream<unknown>]
                >();
                const updateStream = new StreamPuppet<any>();
                (async () => {
                    const observerStream: AsyncIterable<
                        [Cx, ObserverItem<any>]
                    > = coldStream;

                    try {
                        for await (const [cx, item] of observerStream) {
                            if (item.type === 'start') {
                                result.resolve(cx, [
                                    item.initialValue,
                                    astream(updateStream),
                                ]);
                            } else if (item.type === 'next') {
                                await updateStream.next(cx, item.value);
                            } else {
                                assertNever(cx, item);
                            }
                        }
                    } catch (error) {
                        result.reject(toError(cx, error));
                        await updateStream.throw(error);
                    } finally {
                        updateStream.end();
                    }
                })()
                    .catch(error => {
                        logger.error(
                            cx,
                            'createProcessorProxy observer',
                            error
                        );
                        result.reject(error);
                        return updateStream.throw(error);
                    })
                    .finally(() => {
                        result.reject(new CancelledError(cx));
                        updateStream.end();
                    });

                return result.promise;
            } else {
                return astream(coldStream);
            }
        } else {
            assertNever(cx, processor);
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
            return (cx: Cx) => {
                throw new AppError(
                    cx,
                    'rpc client supports only string methods'
                );
            };
        }
        const name = nameOrSymbol;

        const processor = api[name];
        if (!processor) {
            return (cx: Cx) => {
                throw new AppError(cx, `unknown rpc endpoint: ${name}`);
            };
        }

        return createProcessorProxy(conn, getHeaders, processor, name);
    }

    return new Proxy<any>({}, {get});
}

async function waitMessage<S extends Message>(
    parentCx: Cx,
    conn: Connection<Message>,
    predicate: (msg: Message) => msg is S,
    timeoutMs: number
): Promise<S | undefined>;
async function waitMessage(
    parentCx: Cx,
    conn: Connection<Message>,
    predicate: (msg: Message) => boolean,
    timeoutMs: number
): Promise<Message | undefined>;
async function waitMessage<S extends Message>(
    parentCx: Cx,
    conn: Connection<Message>,
    predicate: ((msg: Message) => msg is Message) | ((msg: Message) => boolean),
    timeoutMs: number
): Promise<S | undefined> {
    const result = new Deferred<S | undefined>();
    const [cx, cancelCx] = parentCx.withCancel();
    conn.subscribe(cx, {
        next: async (cx, msg) => {
            if (predicate(msg)) {
                result.resolve(cx, msg as any);
                cancelCx();
            }
        },
        throw: async error => {
            result.reject(error);
            cancelCx();
        },
        close: () => {
            result.resolve(cx, undefined);
            cancelCx();
        },
    });

    ignoreCancel(wait(cx, timeoutMs))
        .then(() => {
            if (result.state === 'pending') {
                result.reject(
                    new AppError(cx, `stream timeout after ${timeoutMs}`)
                );
            }
            cancelCx();
        })
        .catch(err => {
            logger.error(cx, 'unexpected error after timed out', err);
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

    async launch(cx: Cx): Promise<void> {
        await this.transport.launch(cx, (cx, conn) =>
            this.handleConnection(cx, conn)
        );
    }

    async close(cx: Cx) {
        await this.transport.close(cx);
    }

    private handleConnection(cx: Cx, conn: Connection<Message>): void {
        setupRpcServerConnection(
            Cx.todo(),
            this.api,
            conn,
            this.state,
            this.serverName
        );
    }
}

async function handleRequestStreamer<TState>(
    cx: Cx,
    conn: Connection<Message>,
    processor: Streamer<TState, any, any>,
    msg: RequestMessage,
    state: TState,
    serverName: string
) {
    const requestId = msg.id;

    try {
        await conn.send(cx, {
            id: createMessageId(),
            type: 'response',
            requestId,
            payload: {type: 'start'},
            headers: {},
        });

        const processorStream = astream(
            processor.stream(cx, state, msg.payload.arg, msg.headers)
        )
            .map((cx, value) => ({type: 'next' as const, value}))
            .catch(error => [cx, {type: 'error' as const, error}]);
        for await (const [cx, item] of processorStream) {
            if (!cx.alive) {
                break;
            }

            const itemMessageId = createMessageId();

            // we must subscribe for an ack before sending the message
            const ack = waitMessage(
                cx,
                conn,
                msg => msg.type === 'ack' && msg.itemId === itemMessageId,
                RPC_ACK_TIMEOUT_MS
            );

            let payload: ResponsePayload;
            if (item.type === 'next') {
                payload = {type: 'item', item: item.value};
            } else if (item.type === 'error') {
                logRpcError(cx, item.error, msg.payload.name, serverName);

                payload = {
                    type: 'error',
                    message: getReadableError(item.error),
                };
            } else {
                assertNever(cx, item);
            }

            await conn.send(cx, {
                id: itemMessageId,
                type: 'response',
                requestId,
                payload,
                headers: {},
            });

            await ack;
        }
    } finally {
        if (cx.alive) {
            await conn.send(cx, {
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
    cx: Cx,
    conn: Connection<Message>,
    handler: Handler<TState, any, any>,
    msg: RequestMessage,
    state: TState
) {
    const result = await handler.handle(
        cx,
        state,
        msg.payload.arg,
        msg.headers
    );
    await conn.send(cx, {
        id: createMessageId(),
        type: 'response',
        requestId: msg.id,
        payload: {type: 'success', result},
        headers: {},
    });
}

async function handleRequest<TState>(
    cx: Cx,
    conn: Connection<Message>,
    msg: RequestMessage,
    api: Api<TState>,
    state: TState,
    serverName: string
) {
    try {
        const processor = api[msg.payload.name];
        if (processor.type === 'handler') {
            logger.debug(cx, 'start rpc handle', msg.payload.name);
            await handleRequestHandler(cx, conn, processor, msg, state);
            logger.debug(cx, 'finish rpc handle', msg.payload.name);
        } else if (processor.type === 'streamer') {
            await handleRequestStreamer(
                cx,
                conn,
                processor,
                msg,
                state,
                serverName
            );
        } else {
            assertNever(cx, processor);
        }
    } catch (err: any) {
        logRpcError(cx, err, msg.payload.name, serverName);

        await conn.send(cx, {
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
    cx: Cx,
    err: unknown,
    procedureName: string,
    serverName: string
) {
    if (isCancelledError(err) && !cx.alive) {
        logger.warn(
            cx,
            `[${serverName}] cancel during ${procedureName} RPC request`
        );
    } else if (err instanceof BusinessError) {
        logger.warn(
            cx,
            `[${serverName}] error during ${procedureName} RPC request:`,
            getReadableError(err)
        );
    } else {
        logger.error(
            cx,
            `[${serverName}] error during ${procedureName} RPC request:`,
            err
        );
    }
}

export function setupRpcServerConnection<TState>(
    connectionCx: Cx,
    api: Api<TState>,
    conn: Connection<Message>,
    state: TState,
    serverName: string
): void {
    // we use requestId as stream id
    const [serverCx, serverCancel] = connectionCx.withCancel();
    const contextManager = new ContextManager<MessageId>(serverCx);

    conn.subscribe(serverCx, {
        next: async (cx, message) => {
            if (message.type === 'request') {
                try {
                    const requestCx = contextManager.start(cx, message.id);
                    await handleRequest(
                        requestCx,
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
                assertNever(cx, message);
            }
        },
        throw: async error => {
            logger.error(serverCx, 'serverRpcServerConnection throw', error);
            contextManager.finishAll();
        },
        close: () => {
            serverCancel();
        },
    });
}
