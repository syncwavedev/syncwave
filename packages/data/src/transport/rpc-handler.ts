import {RPC_CALL_TIMEOUT_MS} from '../constants.js';
import {context, createTraceId} from '../context.js';
import {Deferred} from '../deferred.js';
import {
    AppError,
    BusinessError,
    CancelledError,
    ErrorCode,
    getErrorCode,
    getReadableError,
    toError,
} from '../errors.js';
import {JobManager} from '../job-manager.js';
import {log} from '../logger.js';
import {
    createMessageId,
    Message,
    MessageHeaders,
} from '../transport/message.js';
import {
    catchConnectionClosed,
    Connection,
    ConnectionClosedError,
} from '../transport/transport.js';
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
    const jobManager = new JobManager();

    const cancelCleanup = context().onCancel(cleanup);

    function cleanup() {
        unsub();
        jobManager.finishAll();
        cancelCleanup();
    }

    const unsub = conn.subscribe({
        next: async msg => {
            if (msg.type === 'request') {
                const traceId = msg.headers.traceId ?? createTraceId();
                await jobManager.start(msg.id, traceId, async () => {
                    try {
                        const handler = getRequiredProcessor(
                            api,
                            msg.payload.name
                        );

                        const result: any = await handler.handle(
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
                        reportRpcError(error, 'rpc handler');
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
                        jobManager.finish(msg.id);
                    }
                });
            } else if (msg.type === 'response') {
                // ignore
            } else if (msg.type === 'cancel') {
                jobManager.cancel(msg.requestId);
            } else {
                assertNever(msg);
            }
        },
        throw: async () => {
            jobManager.finishAll();
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
                throw new AppError('rpc client supports only string methods');
            };
        }
        const name = nameOrSymbol;

        const handler = api[name];
        if (!handler) {
            return () => {
                throw new AppError(`unknown rpc endpoint: ${name}`);
            };
        }

        return createHandlerProxy(conn, getHeaders, handler, name);
    }

    return new Proxy<any>({}, {get});
}

export class RpcError extends AppError {
    constructor(message: string) {
        super(message);
    }
}

export class RpcTimeoutError extends RpcError {}

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
                        reconstructError({
                            message: msg.payload.message,
                            code: msg.payload.code,
                            method: name,
                            arg,
                        })
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
            result.reject(new ConnectionClosedError());
        },
    });

    try {
        wait({ms: RPC_CALL_TIMEOUT_MS, onCancel: 'resolve'})
            .then(() => {
                if (result.state === 'pending') {
                    result.reject(
                        new RpcTimeoutError(
                            `rpc call ${name}(${JSON.stringify(arg)}) failed: timeout`
                        )
                    );
                    cleanup();
                }
            })
            .catch((err: unknown) => {
                log.error(toError(err), 'unexpected error after rpc timed out');
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
        try {
            arg = processor.req.parse(arg);
        } catch (error) {
            return new AppError(
                `rpc ${name}(${JSON.stringify(arg)}) validation failed`,
                {cause: error}
            );
        }

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

export function reportRpcError(error: unknown, context: string) {
    if (error instanceof BusinessError) {
        log.warn(error, `[${context}] rpc business error`);
    } else if (error instanceof CancelledError) {
        log.debug(error, `[${context}] rpc cancelled`);
    } else {
        log.error(
            toError(error),
            `[${context}] rpc unexpected error: ` + JSON.stringify(error)
        );
    }
}

export function reconstructError(params: {
    message: string;
    code: string;
    method: string;
    arg: unknown;
}): AppError {
    if (params.code === 'unknown') {
        return new RpcError(params.message);
    } else if (params.code === 'cancelled') {
        return new CancelledError(params.message);
    } else {
        return new BusinessError(
            params.message,
            params.code as ErrorCode,
            params
        );
    }
}
