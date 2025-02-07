import {z} from 'zod';
import {Cancel, Context, context} from '../context.js';
import {
    AppError,
    CancelledError,
    getErrorCode,
    getReadableError,
    toError,
} from '../errors.js';
import {JobManager} from '../job-manager.js';
import {log} from '../logger.js';
import {Channel, ChannelWriter, Stream} from '../stream.js';
import {Message, MessageHeaders} from '../transport/message.js';
import {catchConnectionClosed, Connection} from '../transport/transport.js';
import {assertNever, Brand, catchCancel, run} from '../utils.js';
import {createUuid, Uuid, zUuid} from '../uuid.js';
import {
    createRpcHandlerClient,
    launchRpcHandlerServer,
    reconstructError,
    reportRpcError,
} from './rpc-handler.js';
import {
    createApi,
    getRequiredProcessor,
    handler,
    Handler,
    InferRpcClient,
    Streamer,
} from './rpc.js';

export type StreamerApi<TState> = Record<
    string,
    Handler<TState, unknown, unknown> | Streamer<TState, unknown, unknown>
>;

export function launchRpcStreamerServer<T>(
    api: StreamerApi<T>,
    state: T,
    conn: Connection<Message>
) {
    const client = createRpcHandlerClient(
        createRpcStreamerClientApi(),
        conn,
        () => ({traceId: context().traceId})
    );

    function cleanup() {
        unsub();
        serverApiState.close();
        cancelCleanup();
    }

    const cancelCleanup = context().onCancel(cleanup);

    const unsub = conn.subscribe({
        next: () => Promise.resolve(),
        throw: () => Promise.resolve(),
        close: () => cleanup(),
    });

    const serverApiState = new RpcStreamerServerApiState(
        state,
        new JobManager(),
        client
    );
    launchRpcHandlerServer(
        createRpcStreamerServerApi(api),
        serverApiState,
        conn
    );
}

type StreamId = Brand<Uuid, 'stream_id'>;
function createStreamId() {
    return createUuid() as StreamId;
}

function zStreamId() {
    return zUuid<StreamId>();
}

class RpcStreamerServerApiState<T> {
    constructor(
        public readonly state: T,
        public readonly jobManager: JobManager<StreamId>,
        public readonly client: RpcStreamerClientRpc
    ) {}

    close() {
        this.jobManager.finishAll();
    }
}

function createRpcStreamerServerApi<TState>(api: StreamerApi<TState>) {
    return createApi<RpcStreamerServerApiState<TState>>()({
        handle: handler({
            req: z.object({name: z.string(), arg: z.unknown()}),
            res: z.unknown(),
            handle: async (state, req, headers) => {
                const processor = getRequiredProcessor(api, req.name);
                if (processor.type !== 'handler') {
                    throw new AppError('processor must be a handler');
                }

                return await processor.handle(state.state, req.arg, headers);
            },
        }),
        stream: handler({
            req: z.object({
                name: z.string(),
                arg: z.any(),
                streamId: zStreamId(),
            }),
            res: z.object({}),
            handle: async (state, {name, streamId, arg}, headers) => {
                const processor = getRequiredProcessor(api, name);
                if (processor.type !== 'streamer') {
                    throw new AppError('processor must be a streamer');
                }

                catchCancel(
                    state.jobManager.start(
                        streamId,
                        context().traceId,
                        async () => {
                            try {
                                for await (const value of processor.stream(
                                    state.state,
                                    arg,
                                    headers
                                )) {
                                    await catchConnectionClosed(
                                        state.client.next({streamId, value})
                                    );
                                }
                            } catch (error: unknown) {
                                reportRpcError(
                                    error,
                                    `${name}${JSON.stringify(arg)}`
                                );
                                // no point in sending throw if the stream was cancelled by client
                                if (!state.jobManager.isCancelled(streamId)) {
                                    await catchConnectionClosed(
                                        state.client.throw({
                                            streamId,
                                            message: getReadableError(error),
                                            code: getErrorCode(error),
                                        })
                                    );
                                }
                            } finally {
                                // no point in sending end if the stream was cancelled by client
                                if (!state.jobManager.isCancelled(streamId)) {
                                    await catchConnectionClosed(
                                        state.client.end({streamId})
                                    );
                                }

                                state.jobManager.finish(streamId);
                            }
                        }
                    )
                ).catch(error => {
                    log.error(error, 'stream failed');
                });

                return {streamId};
            },
        }),
        cancel: handler({
            req: z.object({streamId: zStreamId()}),
            res: z.object({}),
            handle: async (state, {streamId}) => {
                state.jobManager.cancel(streamId);

                return {};
            },
        }),
    });
}

class RpcStreamerClientApiState {
    private readonly subs = new Map<
        StreamId,
        {
            context: Context;
            method: string;
            arg: unknown;
            writer: ChannelWriter<unknown>;
        }
    >();

    create(
        streamId: StreamId,
        writer: ChannelWriter<unknown>,
        method: string,
        arg: unknown
    ) {
        if (this.subs.has(streamId)) {
            throw new AppError(`stream ${streamId} already exists`);
        }

        this.subs.set(streamId, {context: context(), writer, method, arg});
    }

    async next(streamId: StreamId, value: unknown) {
        const sub = this.getSub(streamId);
        await sub?.context.run(() => sub.writer.next(value));
    }

    async throw(params: {streamId: StreamId; code: string; message: string}) {
        const sub = this.getSub(params.streamId);
        await sub?.context.run(() =>
            sub.writer.throw(
                toError(
                    reconstructError({
                        message: params.message,
                        code: params.code,
                        method: sub.method,
                        arg: sub.arg,
                    })
                )
            )
        );
    }

    end(streamId: StreamId) {
        const sub = this.getSub(streamId);
        sub?.context.run(() => sub.writer.end());
    }

    finish(streamId: StreamId) {
        const sub = this.subs.get(streamId);
        if (!sub) {
            return;
        }
        const {context, writer} = sub;
        this.subs.delete(streamId);
        context
            .run(() =>
                writer.throw(new CancelledError()).finally(() => writer.end())
            )
            .catch(error => {
                log.error(error, 'failed to finish the channel');
            });
    }

    finishAll() {
        for (const streamId of [...this.subs.keys()]) {
            this.finish(streamId);
        }
    }

    private getSub(streamId: StreamId) {
        const channel = this.subs.get(streamId);
        if (!channel) {
            log.warn(`unknown streamId: ${streamId}`);
        }

        return channel;
    }
}

function createRpcStreamerClientApi() {
    return createApi<RpcStreamerClientApiState>()({
        next: handler({
            req: z.object({streamId: zStreamId(), value: z.unknown()}),
            res: z.object({}),
            handle: async (state, {streamId, value}) => {
                await state.next(streamId, value);

                return {};
            },
        }),
        throw: handler({
            req: z.object({
                streamId: zStreamId(),
                message: z.string(),
                code: z.string(),
            }),
            res: z.object({}),
            handle: async (state, {streamId, message, code}) => {
                await state.throw({streamId, message, code});

                return {};
            },
        }),
        end: handler({
            req: z.object({streamId: zStreamId()}),
            res: z.object({}),
            handle: async (state, {streamId}) => {
                state.end(streamId);

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
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders
): InferRpcClient<TApi> {
    const clientApiState = new RpcStreamerClientApiState();
    launchRpcHandlerServer(createRpcStreamerClientApi(), clientApiState, conn);

    const server = createRpcHandlerClient(
        createRpcStreamerServerApi(api),
        conn,
        getHeaders
    );

    let cancelCleanup: Cancel | undefined = undefined;
    function cleanup() {
        unsub();
        clientApiState.finishAll();
        cancelCleanup?.();
    }

    cancelCleanup = context().onCancel(cleanup);

    const unsub = conn.subscribe({
        next: () => Promise.resolve(),
        throw: async () => clientApiState.finishAll(),
        close: () => cleanup(),
    });

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

        return (arg: unknown, headers?: MessageHeaders) => {
            // validate argument
            arg = handler.req.parse(arg);

            if (handler.type === 'handler') {
                return server.handle({name, arg}, headers);
            } else if (handler.type === 'streamer') {
                const streamId = createStreamId();
                const streamContext = `stream ${streamId} ${name}(${JSON.stringify(arg)})`;

                let cancelCleanup: Cancel | undefined = undefined;
                const cleanup = () => {
                    clientApiState.finish(streamId);
                    cancelCleanup?.();
                };

                cancelCleanup = context().onCancel(() => {
                    cleanup();
                });

                return new Stream(writer => {
                    run(async () => {
                        const channel = new Channel();
                        clientApiState.create(streamId, channel, name, arg);

                        await server.stream({streamId, name, arg}, headers);
                        await channel.pipe(writer);
                    }).catch(error => {
                        cleanup();
                        log.error(error, `failed to start streaming ${name}`);
                    });

                    return () => {
                        // we need to run cancellation separately to avoid cancellation of the cancellation
                        context().detach(() => {
                            log.info(
                                `${streamContext} aborted, send cancel to the server...`
                            );
                            cleanup();
                            catchConnectionClosed(
                                server.cancel({streamId})
                            ).catch(error => {
                                log.error(
                                    toError(error),
                                    `${streamContext} failed to cancel stream`
                                );
                            });
                        });
                    };
                }).finally(() => {
                    cleanup();
                });
            } else {
                assertNever(handler);
            }
        };
    }

    return new Proxy<any>({}, {get});
}
