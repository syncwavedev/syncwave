import type {Tracer} from '@opentelemetry/api';
import {RPC_CALL_TIMEOUT_MS} from '../constants.js';
import {type Cancel, Context, context} from '../context.js';
import {Deferred} from '../deferred.js';
import {
    AppError,
    BusinessError,
    CancelledError,
    type ErrorCode,
    getErrorCode,
    getReadableError,
    toError,
} from '../errors.js';
import {JobManager} from '../job-manager.js';
import {log} from '../logger.js';
import {
    catchConnectionClosed,
    type Connection,
    ConnectionClosedError,
    ConnectionThrowError,
} from '../transport/transport.js';
import {parseValue} from '../type.js';
import {assertNever, type Unsubscribe, wait} from '../utils.js';
import {createRpcMessageId, type MessageHeaders} from './rpc-message.js';
import {stringifyLogPart} from './rpc-streamer.js';
import {RpcConnection} from './rpc-transport.js';
import {
    getRequiredProcessor,
    type Handler,
    type InferRpcClient,
    type Processor,
} from './rpc.js';

export type HandlerApi<TState> = Record<string, Handler<TState, any, any>>;

export function launchRpcHandlerServer<T>(
    api: HandlerApi<T>,
    state: T,
    conn: RpcConnection,
    tracer: Tracer
): Cancel {
    context().ensureActive();

    const jobManager = new JobManager();

    const cancelCleanup = context().onEnd(cleanup);

    function cleanup(reason: unknown) {
        unsub();
        jobManager.finishAll(reason);
        cancelCleanup();
    }

    const unsub = conn.subscribe({
        next: async msg => {
            if (msg.type === 'request') {
                const [actionCtx, cancelActionCtx] = Context.restore(
                    {
                        span: `raw_handle ${msg.payload.name}(${stringifyLogPart(msg.payload.arg)})`,
                        attributes: {
                            'rpc.method': msg.payload.name,
                            'rpc.arg': stringifyLogPart(msg.payload.arg),
                        },
                    },
                    msg.headers,
                    tracer
                );
                await jobManager.start(
                    msg.id,
                    actionCtx,
                    cancelActionCtx,
                    async () => {
                        try {
                            const handler = getRequiredProcessor(
                                api,
                                msg.payload.name
                            );

                            const result: unknown = await handler.handle(
                                state,
                                msg.payload.arg,
                                {
                                    headers: msg.headers,
                                    requestId: msg.id,
                                }
                            );

                            await catchConnectionClosed(
                                conn.send({
                                    id: createRpcMessageId(),
                                    headers: {
                                        ...context().extract(),
                                    },
                                    type: 'response',
                                    requestId: msg.id,
                                    payload: {type: 'success', result},
                                })
                            );
                        } catch (error) {
                            reportRpcError(
                                toError(error),
                                `${msg.payload.name}(${stringifyLogPart(msg.payload.arg)})`
                            );
                            await catchConnectionClosed(
                                conn.send({
                                    id: createRpcMessageId(),
                                    headers: {
                                        ...context().extract(),
                                    },
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
                            jobManager.finish(
                                msg.id,
                                new AppError('job finished')
                            );
                        }
                    }
                );
            } else if (msg.type === 'response') {
                // ignore
            } else if (msg.type === 'cancel') {
                jobManager.cancel(msg.requestId, msg.reason);
            } else {
                assertNever(msg);
            }
        },
        throw: async () => {
            jobManager.finishAll(new AppError('transport throw'));
        },
        close: () => {
            cleanup(new AppError('transport closed'));
        },
    });

    return cleanup;
}

export function createRpcHandlerClient<TApi extends HandlerApi<any>>(
    api: TApi,
    conn: Connection<unknown>,
    getHeaders: () => Partial<MessageHeaders>
): InferRpcClient<TApi> {
    function get(_target: unknown, nameOrSymbol: string | symbol) {
        if (typeof nameOrSymbol !== 'string') {
            return () => {
                throw new AppError('rpc client supports only string methods');
            };
        }
        const name = nameOrSymbol;

        // special case for client close
        if (name === 'close') {
            return (reason: unknown) => {
                conn.close(reason);
            };
        }

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
    conn: RpcConnection,
    name: string,
    arg: unknown,
    headers: MessageHeaders
) {
    context().ensureActive();

    const requestId = createRpcMessageId();
    const result = new Deferred<any>();
    const cancelCleanup = context().onEnd(reason => {
        cleanup(reason);
        result.reject(
            new CancelledError('proxyRequest: parent context cancelled', reason)
        );
    });

    let unsub: Unsubscribe | undefined = undefined;

    function cleanup(reason: unknown) {
        cancelCleanup();
        if (result.state === 'pending') {
            result.reject(toError(reason));
            catchConnectionClosed(
                conn.send({
                    id: createRpcMessageId(),
                    headers: {
                        ...context().extract(),
                    },
                    type: 'cancel',
                    requestId,
                    reason: getReadableError(reason),
                })
            ).catch(error =>
                log.error(error, 'proxyRequest: failed to send cancellation')
            );
        }
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
                        })
                    );
                } else {
                    assertNever(msg.payload);
                }
            } finally {
                cleanup(new AppError('unsub'));
            }
        },
        throw: async error => {
            cleanup(
                new ConnectionThrowError('proxyRequest: connection throw', {
                    cause: error,
                })
            );
            result.reject(error);
        },
        close: reason => {
            const error = new ConnectionClosedError(
                `proxyRequest: connection closed (${getReadableError(reason)}) ` +
                    name +
                    '(' +
                    JSON.stringify(arg)?.slice(0, 100) +
                    ')',
                {
                    cause: reason,
                }
            );
            cleanup(error);
            result.reject(error);
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
                    cleanup(new AppError('timeout'));
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
        cleanup(new AppError('end of rpc proxy request'));
    }
}

function createHandlerProxy(
    rawConn: Connection<unknown>,
    getHeaders: () => Partial<MessageHeaders>,
    processor: Processor<unknown, unknown, unknown>,
    name: string
) {
    const conn = new RpcConnection(rawConn);

    return async (arg: unknown, partialHeaders?: MessageHeaders) => {
        try {
            arg = parseValue(processor.req, arg);
        } catch (error) {
            throw new AppError(
                `rpc ${name}(${JSON.stringify(arg)}) validation failed`,
                {cause: error}
            );
        }

        const [requestCtx, cancelRequestCtx] = context().createChild({
            span: `raw_call ${name}(${stringifyLogPart(arg)})`,
            attributes: {
                'rpc.method': name,
                'rpc.arg': stringifyLogPart(arg),
            },
        });

        const result: unknown = await requestCtx.run(async () => {
            const headers = Object.assign(
                {...context().extract()},
                getHeaders(),
                partialHeaders ?? {}
            );

            return await proxyRequest(conn, name, arg, headers);
        });

        cancelRequestCtx(new AppError('end of rpc handle'));

        return result;
    };
}

export function reportRpcError(error: AppError, callInfo: string) {
    if (error instanceof BusinessError) {
        log.warn(error, `[${callInfo}] business error`);
    } else if (error instanceof CancelledError) {
        if (
            error.cause === 'stream_has_no_consumers' ||
            error.cause === 'connection_closed'
        ) {
            log.info(`[${callInfo}] cancelled: stream has no consumers`);
        } else {
            log.warn(error, `[${callInfo}] cancelled`);
        }
    } else {
        log.error(
            error,
            `${callInfo} failed: ` + stringifyLogPart(error.toJSON())
        );
    }
}

export function reconstructError(params: {
    message: string;
    code: string;
}): AppError {
    if (params.code === 'unknown') {
        return new RpcError(params.message);
    } else if (params.code === 'cancelled') {
        return new CancelledError(params.message, 'remote rpc cancelled');
    } else {
        return new BusinessError(
            params.message,
            params.code as ErrorCode,
            params
        );
    }
}
