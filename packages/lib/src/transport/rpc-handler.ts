import {RPC_CALL_TIMEOUT_MS} from '../constants.js';
import {type Cancel, Context, context} from '../context.js';
import {anonymous, type Authenticator} from '../data/auth.js';
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
import {checkValue} from '../type.js';
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
    authenticator: Authenticator | undefined
): Cancel {
    context().ensureActive();

    const jobManager = new JobManager();

    const cancelCleanup = context().onEnd(cleanup);

    function cleanup(reason: unknown) {
        unsub(reason);
        jobManager.finishAll(reason);
        cancelCleanup(reason);
    }

    const unsub = conn.subscribe({
        next: async msg => {
            if (msg.type === 'request') {
                const [actionCtx, cancelActionCtx] = Context.restore(
                    {
                        span: `raw_handle ${msg.payload.name}`,
                    },
                    msg.headers
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
                                    principal: authenticator
                                        ? await authenticator.authenticate(
                                              msg.headers.auth
                                          )
                                        : anonymous,
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new Proxy<any>({}, {get});
}

export class RpcError extends AppError {
    constructor(
        message: string,
        public readonly method: string
    ) {
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
        cancelCleanup(reason);
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
                log.error({
                    error,
                    msg: 'proxyRequest: failed to send cancellation',
                })
            );
        }
        unsub?.(reason);
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
                    stringifyLogPart(arg) +
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
                            `rpc call ${name}(${stringifyLogPart(arg)}) failed: timeout`,
                            name
                        )
                    );
                    cleanup(new AppError('timeout'));
                }
            })
            .catch((error: unknown) => {
                log.error({
                    error,
                    msg: 'unexpected error after rpc timed out',
                });
            });

        await conn.send({
            id: requestId,
            type: 'request',
            headers,
            payload: {name, arg},
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
            arg = checkValue(processor.req, arg);
        } catch (error) {
            throw new AppError(
                `rpc ${name}(${JSON.stringify(arg)}) validation failed`,
                {cause: error}
            );
        }

        const [requestCtx, cancelRequestCtx] = context().createChild({
            span: `raw_call ${name}`,
        });

        const result: unknown = await requestCtx.run(async () => {
            const headers = Object.assign(
                {...context().extract()},
                getHeaders(),
                partialHeaders ?? {}
            );

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await proxyRequest(conn, name, arg, headers);
        });

        cancelRequestCtx(new AppError('end of rpc handle'));

        return result;
    };
}

export function reportRpcError(error: AppError, callInfo: string) {
    if (error instanceof BusinessError) {
        log.warn({error, msg: `[${callInfo}] business error`});
    } else if (error instanceof CancelledError) {
        if (error.cause === 'stream_has_no_consumers') {
            log.info({msg: `[${callInfo}] cancelled: stream has no consumers`});
        } else if (error.cause === 'connection_closed') {
            log.info({msg: `[${callInfo}] cancelled: connection closed`});
        } else {
            log.warn({msg: `[${callInfo}] cancelled: ${error.message}`});
        }
    } else {
        log.error({
            error,
            msg: `${callInfo} failed: ` + stringifyLogPart(error.toJSON()),
        });
    }
}

export function reconstructError(params: {
    message: string;
    code: string;
    method: string;
}): AppError {
    if (params.code === 'unknown') {
        return new RpcError(params.message, params.method);
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
