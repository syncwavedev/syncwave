import {
    astream,
    ColdStream,
    ColdStreamExecutor,
    toObservable,
} from '../../async-stream.js';
import {RPC_ACK_TIMEOUT_MS, RPC_CALL_TIMEOUT_MS} from '../../constants.js';
import {ContextManager} from '../../context-manager.js';
import {CancelledError, context, createTraceId} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {BusinessError, getReadableError, toError} from '../../errors.js';
import {logger} from '../../logger.js';
import {
    assertNever,
    ignoreCancel,
    isCancelledError,
    wait,
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
import {Api, Handler, InferRpcClient, Processor, Streamer} from './rpc.js';

async function proxyStreamerCall(
    conn: Connection<Message>,
    exe: ColdStreamExecutor<any>,
    name: string,
    arg: any,
    headers: MessageHeaders,
    cancelSignal: Promise<void>
) {
    context().ensureActive();

    const requestId = createMessageId();

    let state: 'pending' | 'open' | 'complete' = 'pending';

    cancelSignal
        .then(() => {
            return cancel('stream cancellation requested by the consumer');
        })
        .catch(error => {
            logger.error('cancelSignal failed', error);
        });

    context().onCancel(() => {
        if (state !== 'complete') {
            cancel('cancelled').catch(error => {
                logger.error('proxyStreamerCall cx.onCancel', error);
            });
        }
    });

    async function complete() {
        logger.debug(`streamer (complete) ${state} => complete`);
        state = 'complete';
        unsub();
        exe.end();
    }

    async function cancel(err: unknown) {
        logger.debug(`streamer (cancel) ${state} => complete`, err);
        state = 'complete';
        unsub();
        conn.send({
            id: createMessageId(),
            type: 'cancel',
            requestId,
            headers: {},
        });
        await exe
            .throw(toError(err))
            .finally(() => exe.end())
            .catch(error => {
                logger.error('proxyStreamerCall cancel', error);
            });
    }

    const unsub = conn.subscribe({
        next: async msg => {
            if (msg.type !== 'response' || msg.requestId !== requestId) {
                logger.debug('streamer unrelated message', msg);
                return;
            }

            logger.debug('streamer related message', msg);

            function open() {
                logger.debug(`streamer (open) ${state} => open`);
                state = 'open';
            }

            async function cancelInvalid(error: string) {
                logger.debug('streamer (cancelInvalid)', error);
                logger.error('rpc protocol violation', error);
                await cancel(error);
            }

            async function acknowledge() {
                logger.debug('streamer acknowledge');
                conn.send({
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
                    await exe.next(msg.payload.item);
                    await acknowledge();
                } else if (msg.payload.type === 'error') {
                    await exe.throw(
                        new Error('rpc error: ' + msg.payload.message)
                    );
                    await acknowledge();
                } else if (msg.payload.type === 'end') {
                    await complete();
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
        throw: async error => {
            await cancel(error);
        },
        close: () => {
            cancel('lost connection to rpc server').catch(error => {
                logger.error('failed to close rpc server', error);
            });
        },
    });

    try {
        logger.debug('streamer send request...');
        conn.send({
            id: requestId,
            type: 'request',
            headers,
            payload: {name, arg},
        });
    } catch (error) {
        await cancel(error);
    }

    ignoreCancel(wait(RPC_CALL_TIMEOUT_MS))
        .then(async () => {
            logger.log('streamer timeout fired at state ' + state);
            if (state === 'pending') {
                await cancel('stream failed to start');
            }
        })
        .catch(error => {
            logger.error('unexpected error after rpc timed out', error);
        });
}

async function proxyHandlerCall(
    conn: Connection<Message>,
    name: string,
    arg: unknown,
    headers: MessageHeaders
) {
    const requestId = createMessageId();
    const result = new Deferred<any>();
    context().onCancel(() => {
        result.reject(new Error('handler cancellation requested'));
    });

    const unsub = conn.subscribe({
        next: async msg => {
            if (!(msg.type === 'response' && msg.requestId === requestId)) {
                logger.trace('got unrelated message for rpc response');
                return;
            }

            logger.debug('proxyHandlerCall: get response', msg);

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
                unsub();
            }
        },
        throw: async error => {
            logger.debug('proxyHandlerCall: got error', error);
            unsub();
            result.reject(error);
        },
        close: () => {
            logger.debug('proxyHandlerCall: connection closed');
            unsub();
            result.reject(new Error('lost connection to rpc server'));
        },
    });

    try {
        ignoreCancel(wait(RPC_CALL_TIMEOUT_MS))
            .then(() => {
                if (result.state === 'pending') {
                    result.reject(new Error('rpc call failed: timeout'));
                    unsub();
                }
            })
            .catch(err => {
                logger.error('unexpected error after rpc timed out', err);
            });

        logger.debug(`send rpc request: ${name}`);

        conn.send({
            id: requestId,
            type: 'request',
            headers,
            payload: {name, arg},
        });

        return await result.promise;
    } finally {
        logger.debug(`rpc request '${name}' finally`);
        unsub();
    }
}

function createProcessorProxy(
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders,
    processor: Processor<any, any, any>,
    name: string
) {
    return (arg: unknown, partialHeaders?: MessageHeaders) => {
        const headers = Object.assign(
            {traceId: createTraceId()},
            getHeaders(),
            partialHeaders ?? {}
        );
        if (processor.type === 'handler') {
            return proxyHandlerCall(conn, name, arg, headers);
        } else if (processor.type === 'streamer') {
            const coldStream = new ColdStream<any>(exe => {
                const cancelSignal = new Deferred<void>();
                proxyStreamerCall(
                    conn,
                    exe,
                    name,
                    arg,
                    headers,
                    cancelSignal.promise
                ).catch(error => exe.throw(error));

                return () => {
                    logger.debug('');
                    cancelSignal.resolve();
                    exe.throw(new CancelledError()).finally(() => exe.end());
                };
            });

            if (processor.observer) {
                return toObservable(coldStream);
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
            return () => {
                throw new Error('rpc client supports only string methods');
            };
        }
        const name = nameOrSymbol;

        const processor = api[name];
        if (!processor) {
            return () => {
                throw new Error(`unknown rpc endpoint: ${name}`);
            };
        }

        return createProcessorProxy(conn, getHeaders, processor, name);
    }

    return new Proxy<any>({}, {get});
}

async function waitMessage<S extends Message>(
    conn: Connection<Message>,
    predicate: (msg: Message) => msg is S,
    timeoutMs: number
): Promise<S | undefined>;
async function waitMessage(
    conn: Connection<Message>,
    predicate: (msg: Message) => boolean,
    timeoutMs: number
): Promise<Message | undefined>;
async function waitMessage<S extends Message>(
    conn: Connection<Message>,
    predicate: ((msg: Message) => msg is Message) | ((msg: Message) => boolean),
    timeoutMs: number
): Promise<S | undefined> {
    const result = new Deferred<S | undefined>();
    const unsub = conn.subscribe({
        next: async msg => {
            if (predicate(msg)) {
                result.resolve(msg as any);
                unsub();
            }
        },
        throw: async error => {
            result.reject(error);
            unsub();
        },
        close: () => {
            result.resolve(undefined);
            unsub();
        },
    });

    ignoreCancel(wait(timeoutMs))
        .then(() => {
            if (result.state === 'pending') {
                result.reject(new Error(`stream timeout after ${timeoutMs}`));
            }
            unsub();
        })
        .catch(error => {
            logger.error('unexpected error after timed out', error);
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

    close() {
        this.transport.close();
    }

    private handleConnection(conn: Connection<Message>): void {
        setupRpcServerConnection(this.api, conn, this.state, this.serverName);
    }
}

async function handleRequestStreamer<TState>(
    conn: Connection<Message>,
    processor: Streamer<TState, any, any>,
    msg: RequestMessage,
    state: TState,
    serverName: string
) {
    const requestId = msg.id;

    try {
        conn.send({
            id: createMessageId(),
            type: 'response',
            requestId,
            payload: {type: 'start'},
            headers: {},
        });

        const processorStream = astream(
            processor.stream(state, msg.payload.arg, msg.headers)
        )
            .map(value => ({type: 'next' as const, value}))
            .catch(error => ({type: 'error' as const, error}));
        for await (const item of processorStream) {
            if (!context().active) {
                break;
            }

            const itemMessageId = createMessageId();

            // we must subscribe for an ack before sending the message
            const ack = waitMessage(
                conn,
                msg => msg.type === 'ack' && msg.itemId === itemMessageId,
                RPC_ACK_TIMEOUT_MS
            );

            let payload: ResponsePayload;
            if (item.type === 'next') {
                payload = {type: 'item', item: item.value};
            } else if (item.type === 'error') {
                logRpcError(item.error, msg.payload.name, serverName);

                payload = {
                    type: 'error',
                    message: getReadableError(item.error),
                };
            } else {
                assertNever(item);
            }

            conn.send({
                id: itemMessageId,
                type: 'response',
                requestId,
                payload,
                headers: {},
            });

            await ack;
        }
    } finally {
        if (context().active) {
            conn.send({
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
    conn: Connection<Message>,
    handler: Handler<TState, any, any>,
    msg: RequestMessage,
    state: TState
) {
    const result = await handler.handle(state, msg.payload.arg, msg.headers);
    conn.send({
        id: createMessageId(),
        type: 'response',
        requestId: msg.id,
        payload: {type: 'success', result},
        headers: {},
    });
}

async function handleRequest<TState>(
    conn: Connection<Message>,
    msg: RequestMessage,
    api: Api<TState>,
    state: TState,
    serverName: string
) {
    try {
        const processor = api[msg.payload.name];
        if (processor.type === 'handler') {
            await handleRequestHandler(conn, processor, msg, state);
        } else if (processor.type === 'streamer') {
            await handleRequestStreamer(
                conn,
                processor,
                msg,
                state,
                serverName
            );
        } else {
            assertNever(processor);
        }
    } catch (err: unknown) {
        logRpcError(err, msg.payload.name, serverName);

        conn.send({
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
    error: unknown,
    procedureName: string,
    serverName: string
) {
    if (isCancelledError(error) && !context().active) {
        logger.warn(
            `[${serverName}] cancel during ${procedureName} RPC request`
        );
    } else if (error instanceof BusinessError) {
        logger.warn(
            `[${serverName}] error during ${procedureName} RPC request:`,
            getReadableError(error)
        );
    } else {
        logger.error(
            `[${serverName}] error during ${procedureName} RPC request:`,
            error
        );
    }
}

export function setupRpcServerConnection<TState>(
    api: Api<TState>,
    conn: Connection<Message>,
    state: TState,
    serverName: string
): void {
    // we use requestId as stream id
    const contextManager = new ContextManager<MessageId>();

    const serverCancel = conn.subscribe({
        next: async message => {
            if (message.type === 'request') {
                try {
                    await contextManager.start(
                        message.id,
                        message.headers.traceId ?? createTraceId(),
                        async () => {
                            logger.debug(`start job ${message.id}`);
                            await handleRequest(
                                conn,
                                message,
                                api,
                                state,
                                serverName
                            );
                        }
                    );
                } finally {
                    logger.debug(`finish job ${message.id}`);
                    contextManager.finish(message.id);
                }
            } else if (message.type === 'response') {
                // do nothing
            } else if (message.type === 'ack') {
                // nothing to do
            } else if (message.type === 'cancel') {
                logger.debug(`cancel job ${message.requestId}`);
                contextManager.cancel(message.requestId);
            } else {
                assertNever(message);
            }
        },
        throw: async error => {
            logger.error('serverRpcServerConnection throw', error);
            contextManager.finishAll();
        },
        close: () => {
            logger.log('rpc server connection close');
            serverCancel();
        },
    });
}
