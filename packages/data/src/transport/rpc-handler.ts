import {RPC_CALL_TIMEOUT_MS} from '../constants.js';
import {ContextManager} from '../context-manager.js';
import {CancelledError, context, createTraceId} from '../context.js';
import {Deferred} from '../deferred.js';
import {
    BusinessError,
    ErrorCode,
    getErrorCode,
    getReadableError,
} from '../errors.js';
import {logger} from '../logger.js';
import {
    createMessageId,
    Message,
    MessageHeaders,
} from '../transport/message.js';
import {catchConnectionClosed, Connection} from '../transport/transport.js';
import {assertNever, Unsubscribe, wait} from '../utils.js';
import {
    getRequiredProcessor,
    Handler,
    InferRpcClient,
    Processor,
} from './rpc.js';

export type HandlerApi<TState> = Record<string, Handler<TState, any, any>>;

export function launchRpcHandlerServer<T>(
    api: HandlerApi<T>,
    state: T,
    conn: Connection<Message>
) {
    const contextManager = new ContextManager();

    const cancelCleanup = context().onCancel(cleanup);

    function cleanup() {
        unsub();
        contextManager.finishAll();
        cancelCleanup();
    }

    const unsub = conn.subscribe({
        next: async msg => {
            if (msg.type === 'request') {
                const traceId = msg.headers.traceId ?? createTraceId();
                await contextManager.start(msg.id, traceId, async () => {
                    try {
                        const handler = getRequiredProcessor(
                            api,
                            msg.payload.name
                        );

                        const result = await handler.handle(
                            state,
                            msg.payload.arg,
                            msg.headers
                        );

                        await catchConnectionClosed(
                            conn.send({
                                id: createMessageId(),
                                headers: {traceId: context().traceId},
                                type: 'response',
                                requestId: msg.id,
                                payload: {type: 'success', result},
                            })
                        );
                    } catch (error) {
                        reportRpcError(error);
                        await catchConnectionClosed(
                            conn.send({
                                id: createMessageId(),
                                headers: {traceId: context().traceId},
                                type: 'response',
                                requestId: msg.id,
                                payload: {
                                    type: 'error',
                                    message: getReadableError(error),
                                    code: getErrorCode(error),
                                },
                            })
                        );
                    } finally {
                        contextManager.finish(msg.id);
                    }
                });
            } else if (msg.type === 'response') {
                // ignore
            } else if (msg.type === 'cancel') {
                contextManager.cancel(msg.requestId);
            } else {
                assertNever(msg);
            }
        },
        throw: async () => {
            contextManager.finishAll();
        },
        close: () => {
            cleanup();
        },
    });
}

export function createRpcHandlerClient<TApi extends HandlerApi<any>>(
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

        const handler = api[name];
        if (!handler) {
            return () => {
                throw new Error(`unknown rpc endpoint: ${name}`);
            };
        }

        return createHandlerProxy(conn, getHeaders, handler, name);
    }

    return new Proxy<any>({}, {get});
}

export class RpcError extends Error {}

async function proxyRequest(
    conn: Connection<Message>,
    name: string,
    arg: unknown,
    headers: MessageHeaders
) {
    const requestId = createMessageId();
    const result = new Deferred<any>();
    const cancelCleanup = context().onCancel(() => {
        cleanup();
        result.reject(new CancelledError());
    });

    let unsub: Unsubscribe | undefined = undefined;

    function cleanup() {
        cancelCleanup();
        unsub?.();
    }

    unsub = conn.subscribe({
        next: async msg => {
            if (!(msg.type === 'response' && msg.requestId === requestId)) {
                return;
            }

            try {
                if (msg.payload.type === 'success') {
                    result.resolve(msg.payload.result);
                } else if (msg.payload.type === 'error') {
                    result.reject(
                        reconstructError(msg.payload.message, msg.payload.code)
                    );
                } else {
                    assertNever(msg.payload);
                }
            } finally {
                cleanup();
            }
        },
        throw: async error => {
            cleanup();
            result.reject(error);
        },
        close: () => {
            cleanup();
            result.reject(new Error('lost connection to rpc server'));
        },
    });

    try {
        wait({ms: RPC_CALL_TIMEOUT_MS, onCancel: 'resolve'})
            .then(() => {
                if (result.state === 'pending') {
                    result.reject(new Error('rpc call failed: timeout'));
                    cleanup();
                }
            })
            .catch(err => {
                logger.error('unexpected error after rpc timed out', err);
            });

        await conn.send({
            id: requestId,
            type: 'request',
            headers,
            payload: {name, arg},
        });

        return await result.promise;
    } finally {
        cleanup();
    }
}

function createHandlerProxy(
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders,
    processor: Processor<unknown, unknown, unknown, unknown>,
    name: string
) {
    return async (arg: unknown, partialHeaders?: MessageHeaders) => {
        // validate argument
        arg = processor.req.parse(arg);

        const [requestCtx, cancelRequestCtx] = context().createChild();

        const result = await requestCtx.run(async () => {
            const headers = Object.assign(
                {traceId: createTraceId()},
                getHeaders(),
                partialHeaders ?? {}
            );

            return await proxyRequest(conn, name, arg, headers);
        });

        cancelRequestCtx();

        return result;
    };
}

export function reportRpcError(error: unknown) {
    if (error instanceof BusinessError) {
        logger.warn('business error', error);
    } else if (error instanceof CancelledError) {
        logger.debug('cancelled error', error);
    } else {
        logger.error('unexpected error', error);
    }
}

export function reconstructError(message: string, code: string) {
    if (code === 'unknown') {
        return new RpcError(message);
    } else if (code === 'cancelled') {
        return new CancelledError(message);
    } else {
        return new BusinessError(message, code as ErrorCode);
    }
}
