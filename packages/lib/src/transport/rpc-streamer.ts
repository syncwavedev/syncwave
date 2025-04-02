import {Type} from '@sinclair/typebox';
import {type Cancel, Context, context} from '../context.js';
import type {Authenticator} from '../data/auth.js';
import {
    AppError,
    CancelledError,
    getErrorCode,
    getReadableError,
    toError,
} from '../errors.js';
import {JobManager} from '../job-manager.js';
import {log} from '../logger.js';
import {
    AsyncIteratorFactory,
    Channel,
    type ChannelWriter,
    toStream,
} from '../stream.js';
import {
    catchConnectionClosed,
    type Connection,
} from '../transport/transport.js';
import {checkValue} from '../type.js';
import {
    assert,
    assertNever,
    type Brand,
    catchCancel,
    run,
    runAll,
    type Unsubscribe,
} from '../utils.js';
import {createUuid, createUuidV4, Uuid} from '../uuid.js';
import {
    createRpcHandlerClient,
    launchRpcHandlerServer,
    reconstructError,
    reportRpcError,
} from './rpc-handler.js';
import type {MessageHeaders} from './rpc-message.js';
import {RpcConnection} from './rpc-transport.js';
import {
    createApi,
    getRequiredProcessor,
    handler,
    type Handler,
    type InferRpcClient,
    type Streamer,
} from './rpc.js';

export type StreamerApi<TState> = Record<
    string,
    Handler<TState, unknown, unknown> | Streamer<TState, unknown, unknown>
>;

export function launchRpcStreamerServer<T>(
    api: StreamerApi<T>,
    state: T,
    conn: RpcConnection,
    authenticator: Authenticator
) {
    context().ensureActive();

    function cleanup(reason: unknown) {
        unsub(reason);
        serverApiState.close(reason);
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

    const serverApiState = new RpcStreamerServerApiState(
        state,
        createRpcHandlerClient(createRpcStreamerClientApi(), conn, () => ({
            ...context().extract(),
        }))
    );
    launchRpcHandlerServer(
        createRpcStreamerServerApi(api),
        serverApiState,
        conn,
        authenticator
    );
}

type StreamId = Brand<Uuid, 'stream_id'>;
function createStreamId() {
    return createUuid() as StreamId;
}

function zStreamId() {
    return Uuid<StreamId>();
}

class RpcStreamerServerApiState<T> {
    public readonly jobManager = new JobManager<StreamId>();

    constructor(
        public readonly state: T,
        public readonly client: RpcStreamerClientRpc
    ) {}

    close(reason: unknown) {
        this.jobManager.finishAll(reason);
        this.client.close(reason);
    }
}

export function stringifyLogPart(arg: unknown) {
    const string = JSON.stringify(arg);
    if (!string) {
        return string;
    }
    if (string.length > 100) {
        return `${string.slice(0, 100)}...`;
    }

    return string?.slice(0, 100);
}

function createRpcStreamerServerApi<TState>(api: StreamerApi<TState>) {
    return createApi<RpcStreamerServerApiState<TState>>()({
        handle: handler({
            req: Type.Object({name: Type.String(), arg: Type.Unknown()}),
            res: Type.Unknown(),
            handle: async (state, req, ctx) => {
                const processor = getRequiredProcessor(api, req.name);
                if (processor.type !== 'handler') {
                    throw new AppError('processor must be a handler');
                }

                const callInfo = `handle_call ${req.name} [rid=${ctx.requestId}]`;

                try {
                    if (log.enabled('debug')) {
                        log.debug(`${callInfo}...`);
                    }

                    const result = await processor.handle(
                        state.state,
                        req.arg,
                        ctx
                    );

                    log.debug(
                        () => `${callInfo} => ${stringifyLogPart(result)}`
                    );

                    return result;
                } catch (error) {
                    log.error(toError(error), `${callInfo} failed`);
                    throw error;
                }
            },
        }),
        stream: handler({
            req: Type.Object({
                name: Type.String(),
                arg: Type.Any(),
                streamId: zStreamId(),
            }),
            res: Type.Object({}),
            handle: async (state, {name, streamId, arg}, headers) => {
                const processor = getRequiredProcessor(api, name);
                if (processor.type !== 'streamer') {
                    throw new AppError('processor must be a streamer');
                }

                const callInfo = `handle ${name} [sid=${streamId}]`;

                log.debug(() => `${callInfo}...`);

                const [ctx, cancelCtx] = context().createDetached({
                    span: `handle_stream ${name}`,
                    attributes: {
                        'rpc.streamId': streamId,
                    },
                });

                catchCancel(
                    state.jobManager.start(
                        streamId,
                        ctx,
                        cancelCtx,
                        async () => {
                            let counter = 0;
                            try {
                                await toStream(
                                    processor.stream(state.state, arg, headers)
                                )
                                    .map((value, index) => ({value, index}))
                                    .mapParallel(async ({value, index}) => {
                                        log.debug(
                                            () =>
                                                `${callInfo} => ${stringifyLogPart(value)}`
                                        );
                                        assert(
                                            index === counter,
                                            'stream value index !== counter'
                                        );
                                        await catchConnectionClosed(
                                            state.client.next({
                                                streamId,
                                                value,
                                                counter: counter++,
                                            })
                                        );
                                    })
                                    .consume();
                            } catch (error: unknown) {
                                reportRpcError(toError(error), callInfo);
                                // no point in sending throw if the stream was cancelled by client
                                if (!state.jobManager.isCancelled(streamId)) {
                                    await catchConnectionClosed(
                                        state.client.throw({
                                            streamId,
                                            message: getReadableError(error),
                                            code: getErrorCode(error),
                                            counter: counter++,
                                        })
                                    );
                                }
                            } finally {
                                log.debug(() => `${callInfo} finished`);

                                // no point in sending end if the stream was cancelled by client
                                if (!state.jobManager.isCancelled(streamId)) {
                                    await catchConnectionClosed(
                                        state.client.end({
                                            streamId,
                                            counter: counter++,
                                        })
                                    );
                                }

                                state.jobManager.finish(
                                    streamId,
                                    new AppError(`${callInfo} finished`)
                                );
                            }
                        }
                    )
                ).catch(error => {
                    log.error(toError(error), `${callInfo} failed`);
                });

                return {streamId};
            },
        }),
        cancel: handler({
            req: Type.Object({streamId: zStreamId(), reason: Type.String()}),
            res: Type.Object({}),
            handle: async (state, {streamId, reason}) => {
                state.jobManager.cancel(
                    streamId,
                    new CancelledError(
                        'stream cancellation requested by the client',
                        reason
                    )
                );

                return {};
            },
        }),
    });
}

class RpcStreamerClientApiState {
    constructor(
        private readonly server: InferRpcClient<
            ReturnType<typeof createRpcStreamerServerApi<unknown>>
        >
    ) {}

    private readonly subs = new Map<
        StreamId,
        {
            counter: number;
            context: Context;
            method: string;
            writer: ChannelWriter<unknown>;
        }
    >();

    create(params: {
        streamId: StreamId;
        writer: ChannelWriter<unknown>;
        method: string;
        arg: unknown;
    }) {
        if (this.subs.has(params.streamId)) {
            throw new AppError(`stream ${params.streamId} already exists`);
        }

        this.subs.set(params.streamId, {
            counter: 0,
            context: context(),
            writer: params.writer,
            method: params.method,
        });
    }

    async next(streamId: StreamId, value: unknown, counter: number) {
        const sub = this.getSub(streamId, counter);
        sub?.context.addEvent('info', 'next');
        await sub?.writer.next(value);
    }

    async throw(params: {
        streamId: StreamId;
        code: string;
        message: string;
        counter: number;
    }) {
        const sub = this.getSub(params.streamId, params.counter);
        sub?.context.addEvent('info', 'throw', {
            'rpc.throw.code': params.code,
            'rpc.throw.message': stringifyLogPart(params.message),
        });
        await sub?.writer.throw(
            toError(
                reconstructError({
                    message: params.message,
                    code: params.code,
                    method: sub.method,
                })
            )
        );
    }

    end(streamId: StreamId, counter: number) {
        const sub = this.getSub(streamId, counter);
        sub?.writer.end();
    }

    finish(streamId: StreamId, reason: unknown) {
        const sub = this.subs.get(streamId);
        if (!sub) {
            return;
        }
        const {context, writer} = sub;
        this.subs.delete(streamId);
        context
            .run(() =>
                writer
                    .throw(
                        new CancelledError(
                            'RpcStreamerClientApiState.finish: context finished',
                            reason
                        )
                    )
                    .finally(() => writer.end())
            )
            .catch(error => {
                log.error(toError(error), 'failed to finish the channel');
            });
    }

    finishAll(reason: unknown) {
        runAll([...this.subs.keys()].map(x => () => this.finish(x, reason)));
    }

    private getSub(streamId: StreamId, counter: number) {
        const channel = this.subs.get(streamId);
        if (channel) {
            assert(channel.counter === counter, 'stream counter mismatch');
            channel.counter++;
        }
        if (!channel) {
            log.warn(`unknown streamId: ${streamId}`);
            context().detach({span: 'getSub: cancel stream'}, () => {
                this.server
                    .cancel({
                        streamId: streamId,
                        reason: `unknown streamId: ${streamId}`,
                    })
                    .catch(error =>
                        log.error(
                            toError(error),
                            `failed to cancel stream ${streamId}`
                        )
                    );
            });
        }

        return channel;
    }
}

function createRpcStreamerClientApi() {
    return createApi<RpcStreamerClientApiState>()({
        next: handler({
            req: Type.Object({
                streamId: zStreamId(),
                value: Type.Unknown(),
                counter: Type.Number(),
            }),
            res: Type.Object({}),
            handle: async (state, {streamId, value, counter}) => {
                await state.next(streamId, value, counter);

                return {};
            },
        }),
        throw: handler({
            req: Type.Object({
                streamId: zStreamId(),
                message: Type.String(),
                code: Type.String(),
                counter: Type.Number(),
            }),
            res: Type.Object({}),
            handle: async (state, {streamId, message, code, counter}) => {
                await state.throw({streamId, message, code, counter});

                return {};
            },
        }),
        end: handler({
            req: Type.Object({streamId: zStreamId(), counter: Type.Number()}),
            res: Type.Object({}),
            handle: async (state, {streamId, counter}) => {
                state.end(streamId, counter);

                return {};
            },
        }),
    });
}

type RpcStreamerClientRpc = InferRpcClient<
    ReturnType<typeof createRpcStreamerClientApi>
>;

export function createRpcStreamerClient<TApi extends StreamerApi<any>>(
    api: TApi,
    conn: Connection<unknown>,
    getHeaders: () => MessageHeaders,
    clientTarget: string
): InferRpcClient<TApi> {
    context().ensureActive();

    const server = createRpcHandlerClient(
        createRpcStreamerServerApi(api),
        conn,
        getHeaders
    );

    const clientApiState = new RpcStreamerClientApiState(server);
    const stopRpcHandlerServer = launchRpcHandlerServer(
        createRpcStreamerClientApi(),
        clientApiState,
        new RpcConnection(conn),
        // we trust the server, so no auth is needed
        undefined
    );

    let cancelCleanup: Unsubscribe | undefined = undefined;
    function cleanup(reason: unknown) {
        unsub(reason);
        clientApiState.finishAll(reason);
        cancelCleanup?.(reason);
        stopRpcHandlerServer(reason);
        conn.close(reason);
    }

    cancelCleanup = context().onEnd(cleanup);

    const unsub = conn.subscribe({
        next: () => Promise.resolve(),
        throw: async error => clientApiState.finishAll(error),
        close: () => cleanup(new AppError('connection closed')),
    });

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
                cleanup('RpcStreamerClient.close');
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
                log.error(
                    toError(error),
                    `invalid request for ${name}` + JSON.stringify(arg)
                );

                throw error;
            }

            if (handler.type === 'handler') {
                const requestId = createUuidV4();
                const [requestCtx, cancelRequestCtx] = context().createChild({
                    span: `call ${name}`,
                    attributes: {
                        'rpc.requestId': requestId,
                    },
                });
                return requestCtx
                    .run(async () => {
                        const callInfo = `call ${clientTarget}.${name} [rid=${requestId}]`;
                        log.debug(() => `${callInfo}...`);
                        return server
                            .handle({name, arg}, headers)
                            .then(async result => {
                                log.debug(
                                    () =>
                                        `${callInfo} => ${stringifyLogPart(result)}`
                                );
                                return result;
                            })
                            .catch(async error => {
                                log.error(
                                    toError(error),
                                    `${callInfo} failed: ${getReadableError(error)}`
                                );
                                throw error;
                            });
                    })
                    .finally(() => {
                        cancelRequestCtx('rpc-streamer: request ended');
                    });
            } else if (handler.type === 'streamer') {
                let cancelCleanup: Cancel | undefined = undefined;
                const cleanup = (reason: unknown) => {
                    factory.close();
                    cancelCleanup?.(reason);
                };

                cancelCleanup = context().onEnd(reason => {
                    cleanup(reason);
                });

                const parentCtx = context();

                const factory = new AsyncIteratorFactory(writer => {
                    const streamId = createStreamId();
                    const [requestCtx, cancelRequestCtx] =
                        parentCtx.createChild({
                            span: `stream ${name}`,
                            attributes: {
                                'rpc.streamId': streamId,
                            },
                        });
                    const cancelRequestCtxCleanUp = requestCtx.onEnd(reason => {
                        writer
                            .throw(
                                new CancelledError(
                                    'factory cancel request',
                                    reason
                                )
                            )
                            .finally(() => {
                                writer.end();
                            })
                            .catch(error => {
                                log.error(
                                    toError(error),
                                    'failed to cancel stream'
                                );
                            });
                    });
                    return requestCtx.run(() => {
                        run(async () => {
                            const channel = new Channel();
                            clientApiState.create({
                                streamId,
                                writer: channel,
                                method: name,
                                arg,
                            });

                            log.debug('start rpc stream...');
                            await server.stream(
                                {streamId, name, arg},
                                {...headers}
                            );
                            await channel.pipe(writer);
                        }).catch(error => {
                            writer.throw(toError(error)).catch(error => {
                                log.error(
                                    toError(error),
                                    'failed to throw stream error'
                                );
                            });
                            cleanup(new AppError('run failed', {cause: error}));
                            log.error(
                                toError(error),
                                'failed to start streaming'
                            );
                        });

                        return (reason: unknown) => {
                            cancelRequestCtxCleanUp(reason);
                            cancelRequestCtx(
                                'cancelRequestCtx: stream has no consumers'
                            );
                            // we need to run cancellation separately to avoid cancellation of the cancellation
                            context().detach({span: 'cancel stream'}, () => {
                                log.debug(
                                    'stream consumer unsubscribed, send cancellation to the server...'
                                );
                                cleanup(new AppError('stream cancelled'));
                                catchConnectionClosed(
                                    server.cancel({
                                        streamId,
                                        reason: 'stream_has_no_consumers',
                                    })
                                )
                                    .then(() => {
                                        log.debug('cancelled');
                                    })
                                    .catch(error => {
                                        log.error(
                                            toError(error),
                                            'failed to cancel stream'
                                        );
                                    });
                            });
                        };
                    });
                });

                return toStream(factory);
            } else {
                assertNever(handler);
            }
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new Proxy<any>({}, {get});
}
