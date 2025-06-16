import {Type} from '@sinclair/typebox';
import {decodeMsgpack, encodeMsgpack} from '../codec.js';
import {RPC_CHUNK_SIZE} from '../constants.js';
import {context} from '../context.js';
import type {Authenticator} from '../data/auth.js';
import {
    AppError,
    CancelledError,
    getReadableError,
    toError,
} from '../errors.js';
import {log} from '../logger.js';
import {toStream, type Stream} from '../stream.js';
import {checkValue} from '../type.js';
import {assertNever, joinBuffers, type Unsubscribe} from '../utils.js';
import {createUuidV4} from '../uuid.js';
import {reportRpcError} from './rpc-handler.js';
import type {MessageHeaders} from './rpc-message.js';
import {
    createRpcStreamerClient,
    launchRpcStreamerServer,
    stringifyLogPart,
    type StreamerApi,
} from './rpc-streamer.js';
import {RpcConnection} from './rpc-transport.js';
import {createApi, streamer, type InferRpcClient} from './rpc.js';
import {type Connection} from './transport.js';

const ignoreMethods = new Set([
    'joinBoardAwareness',
    'updateBoardAwarenessState',
    'echo',
]);

export function launchRpcChunkerServer<T>(
    api: StreamerApi<T>,
    state: T,
    conn: RpcConnection,
    authenticator: Authenticator
) {
    context().ensureActive();

    function cleanup(reason: unknown) {
        unsub(reason);
        cancelCleanup(reason);
    }

    const cancelCleanup = context().onEnd(cleanup);

    const unsub = conn.subscribe({
        next: () => Promise.resolve(),
        throw: () => Promise.resolve(),
        close: () =>
            cleanup(
                new CancelledError(
                    'launchRpcStreamerServer: connection closed',
                    'connection_closed'
                )
            ),
    });

    launchRpcStreamerServer(
        createRpcChunkerServerApi(api),
        state,
        conn,
        authenticator
    );
}

async function* chunkBuffer(
    buffer: Uint8Array,
    chunkSize: number
): AsyncIterable<{
    chunk: Uint8Array;
    last: boolean;
}> {
    if (buffer.length <= chunkSize) {
        yield {chunk: buffer, last: true};
        return;
    }

    for (let i = 0; i < buffer.length; i += chunkSize) {
        yield {
            chunk: buffer.slice(i, i + chunkSize),
            last: i + chunkSize >= buffer.length,
        };
    }
}

function createRpcChunkerServerApi<TState>(api: StreamerApi<TState>) {
    return createApi<TState>()({
        handle: streamer({
            req: Type.Object({
                method: Type.String(),
                arg: Type.Unknown(),
            }),
            item: Type.Object({
                chunk: Type.Uint8Array(),
                last: Type.Boolean(),
            }),
            async *stream(state, {method, arg}, ctx) {
                const handler = api[method];
                if (!handler) {
                    throw new AppError(`unknown rpc endpoint: ${method}`);
                }

                const callInfo = `handle_call ${method} [rid=${ctx.requestId}]`;

                if (handler.type !== 'handler') {
                    throw new AppError(
                        `rpc endpoint ${method} is not a handler`
                    );
                }

                try {
                    if (!ignoreMethods.has(method)) {
                        log.info({msg: `req ${callInfo}...`});
                    }

                    const result = await handler.handle(state, arg, ctx);

                    if (!ignoreMethods.has(method)) {
                        log.info({
                            msg: `res ${callInfo} => ${stringifyLogPart(result)}`,
                        });
                    }
                    yield* chunkBuffer(encodeMsgpack(result), RPC_CHUNK_SIZE);
                } catch (error) {
                    log.error({
                        error,
                        msg: `${callInfo} failed`,
                    });
                    throw error;
                }
            },
        }),
        stream: streamer({
            req: Type.Object({
                method: Type.String(),
                arg: Type.Unknown(),
            }),
            item: Type.Object({
                chunk: Type.Uint8Array(),
                last: Type.Boolean(),
            }),
            async *stream(state, {method, arg}, ctx) {
                const handler = api[method];
                if (!handler) {
                    throw new AppError(`unknown rpc endpoint: ${method}`);
                }
                if (handler.type !== 'streamer') {
                    throw new AppError(
                        `rpc endpoint ${method} is not a stream`
                    );
                }

                const callInfo = `handle ${method} [rid=${ctx.requestId}]`;

                log.info({msg: `req ${callInfo}...`});

                try {
                    for await (const item of handler.stream(state, arg, ctx)) {
                        log.info({
                            msg: `res ${callInfo} => ${stringifyLogPart(item)}`,
                        });
                        yield* chunkBuffer(encodeMsgpack(item), RPC_CHUNK_SIZE);
                    }
                } catch (error) {
                    reportRpcError(toError(error), callInfo);
                    throw error;
                } finally {
                    log.info({msg: `end ${callInfo}`});
                }
            },
        }),
    });
}

export function createRpcChunkerClient<TApi extends StreamerApi<any>>(
    api: TApi,
    conn: Connection<unknown>,
    getHeaders: () => MessageHeaders
): InferRpcClient<TApi> {
    context().ensureActive();

    const server = createRpcStreamerClient(
        createRpcChunkerServerApi(api),
        conn,
        getHeaders
    );

    let cancelCleanup: Unsubscribe | undefined = undefined;
    function cleanup(reason: unknown) {
        cancelCleanup?.(reason);
        conn.close(reason);
    }

    cancelCleanup = context().onEnd(cleanup);

    function get(_target: unknown, nameOrSymbol: string | symbol) {
        if (typeof nameOrSymbol !== 'string') {
            return () => {
                throw new AppError('rpc client supports only string methods');
            };
        }

        const name = nameOrSymbol;

        // special case for client close
        if (name === 'close') {
            return () => {
                cleanup('RpcChunkerClient.close');
            };
        }

        const handler = api[name];
        if (!handler) {
            return () => {
                throw new AppError(`unknown rpc endpoint: ${name}`);
            };
        }

        return (arg: unknown, headers?: Partial<MessageHeaders>) => {
            context().ensureActive();

            try {
                arg = checkValue(handler.req, arg);
            } catch (error) {
                log.error({
                    error,
                    msg: `invalid request for ${name}` + JSON.stringify(arg),
                });

                throw error;
            }

            const requestId = createUuidV4();
            const callInfo = `${name}(${stringifyLogPart(arg)}) [rid=${requestId}]`;
            const logCommunication = !ignoreMethods.has(name);
            if (logCommunication) {
                log.info({msg: `req ${callInfo}...`});
            }

            if (handler.type === 'handler') {
                return server
                    .handle({method: name, arg}, headers)
                    .whileInclusive(x => !x.last)
                    .reduce<Uint8Array[]>((acc, {chunk}) => {
                        acc.push(chunk);
                        return acc;
                    }, [])
                    .then(chunks => decodeMsgpack(joinBuffers(chunks)))
                    .then(result => {
                        if (logCommunication) {
                            log.info({
                                msg: `res ${callInfo} => ${stringifyLogPart(result)}`,
                            });
                        }
                        return result;
                    })
                    .catch(async error => {
                        log.error({
                            error,
                            msg: `${callInfo} failed: ${getReadableError(error)}`,
                        });
                        throw error;
                    });
            } else if (handler.type === 'streamer') {
                return toStream(
                    transformStream(server.stream({method: name, arg}, headers))
                )
                    .map(item => decodeMsgpack(item))
                    .tap(value => {
                        if (logCommunication) {
                            log.info({
                                msg: `next ${callInfo} => ${stringifyLogPart(
                                    value
                                )}`,
                            });
                        }
                    })
                    .catch(error => {
                        log.error({
                            error,
                            msg: `${callInfo} failed: ${getReadableError(
                                error
                            )}`,
                        });
                        throw error;
                    })
                    .finally(() => {
                        if (logCommunication) {
                            log.info({msg: `end ${callInfo}`});
                        }
                    });
            } else {
                assertNever(handler);
            }
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new Proxy<any>({}, {get});
}

async function* transformStream(
    input: Stream<{chunk: Uint8Array; last: boolean}>
): AsyncIterable<Uint8Array> {
    let acc: Uint8Array[] = [];
    for await (const item of input) {
        acc.push(item.chunk);
        if (item.last) {
            yield joinBuffers(acc);
            acc = [];
        }
    }

    if (acc.length > 0) {
        throw new AppError('stream ended without the last chunk');
    }
}
