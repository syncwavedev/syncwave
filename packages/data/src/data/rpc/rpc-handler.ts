import {RPC_CALL_TIMEOUT_MS} from '../../constants.js';
import {ContextManager} from '../../context-manager.js';
import {CancelledError, context, createTraceId} from '../../context.js';
import {Deferred} from '../../deferred.js';
import {getReadableError} from '../../errors.js';
import {logger} from '../../logger.js';
import {assertNever, ignoreCancel, wait} from '../../utils.js';
import {
    createMessageId,
    Message,
    MessageHeaders,
} from '../communication/message.js';
import {Connection} from '../communication/transport.js';
import {Handler, InferRpcClient} from './rpc.js';

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
                        const handler = api[msg.payload.name];
                        if (!handler) {
                            throw new Error(
                                `unknown handler name: ${msg.payload.name}`
                            );
                        }

                        const result = await handler.handle(
                            state,
                            msg.payload.arg,
                            msg.headers
                        );

                        await conn.send({
                            id: createMessageId(),
                            headers: {traceId: context().traceId},
                            type: 'response',
                            requestId: msg.id,
                            payload: {type: 'success', result},
                        });
                    } catch (error) {
                        await conn.send({
                            id: createMessageId(),
                            headers: {traceId: context().traceId},
                            type: 'response',
                            requestId: msg.id,
                            payload: {
                                type: 'error',
                                message: getReadableError(error),
                            },
                        });
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

        return createHandlerProxy(conn, getHeaders, name);
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

    function cleanup() {
        cancelCleanup();
        unsub();
    }

    const unsub = conn.subscribe({
        next: async msg => {
            if (!(msg.type === 'response' && msg.requestId === requestId)) {
                return;
            }

            try {
                if (msg.payload.type === 'success') {
                    result.resolve(msg.payload.result);
                } else if (msg.payload.type === 'error') {
                    result.reject(new RpcError(msg.payload.message));
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
        ignoreCancel(wait(RPC_CALL_TIMEOUT_MS))
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
    name: string
) {
    return async (arg: unknown, partialHeaders?: MessageHeaders) => {
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
