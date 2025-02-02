import {z} from 'zod';
import {ContextManager} from '../../context-manager.js';
import {CancelledError, Context, context} from '../../context.js';
import {toError} from '../../errors.js';
import {logger} from '../../logger.js';
import {Channel, ChannelWriter, Stream} from '../../stream.js';
import {assertNever, Brand, run} from '../../utils.js';
import {createUuid, Uuid, zUuid} from '../../uuid.js';
import {Message, MessageHeaders} from '../communication/message.js';
import {catchConnectionClosed, Connection} from '../communication/transport.js';
import {createRpcHandlerClient, launchRpcHandlerServer} from './rpc-handler.js';
import {createApi, handler, Handler, InferRpcClient, Streamer} from './rpc.js';

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
        new ContextManager(),
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
        public readonly contextManager: ContextManager<StreamId>,
        public readonly client: RpcStreamerClientRpc
    ) {}

    close() {
        this.contextManager.finishAll();
    }
}

function createRpcStreamerServerApi<TState>(api: StreamerApi<TState>) {
    return createApi<RpcStreamerServerApiState<TState>>()({
        handle: handler({
            req: z.object({name: z.string(), arg: z.unknown()}),
            res: z.unknown(),
            handle: async (state, req, headers) => {
                const processor = api[req.name];
                if (processor.type !== 'handler') {
                    throw new Error('processor must be a handler');
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
                const processor = api[name];
                if (processor.type !== 'streamer') {
                    throw new Error('processor must be a streamer');
                }

                state.contextManager
                    .start(streamId, context().traceId, async () => {
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
                            await catchConnectionClosed(
                                state.client.throw({streamId, error})
                            );
                        } finally {
                            await catchConnectionClosed(
                                state.client.end({streamId})
                            );
                            state.contextManager.finish(streamId);
                        }
                    })
                    .catch(error => {
                        logger.error('stream failed', error);
                    });

                return {streamId};
            },
        }),
        cancel: handler({
            req: z.object({streamId: zStreamId()}),
            res: z.object({}),
            handle: async (state, {streamId}) => {
                state.contextManager.cancel(streamId);

                return {};
            },
        }),
    });
}

class RpcStreamerClientApiState {
    private readonly subs = new Map<
        StreamId,
        {context: Context; writer: ChannelWriter<unknown>}
    >();

    create(streamId: StreamId, writer: ChannelWriter<unknown>) {
        if (this.subs.has(streamId)) {
            throw new Error(`stream ${streamId} already exists`);
        }

        this.subs.set(streamId, {context: context(), writer});
    }

    async next(streamId: StreamId, value: unknown) {
        const sub = this.getSub(streamId);
        await sub?.context.run(() => sub.writer.next(value));
    }

    async throw(streamId: StreamId, error: unknown) {
        const sub = this.getSub(streamId);
        await sub?.context.run(() => sub.writer.throw(toError(error)));
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
                logger.error('failed to finish the channel', error);
            });
    }

    private getSub(streamId: StreamId) {
        const channel = this.subs.get(streamId);
        if (!channel) {
            logger.debug(`unknown streamId: ${streamId}`);
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
            req: z.object({streamId: zStreamId(), error: z.unknown()}),
            res: z.object({}),
            handle: async (state, {streamId, error}) => {
                await state.throw(streamId, error);

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

        return (arg: unknown, headers?: MessageHeaders) => {
            if (handler.type === 'handler') {
                return server.handle({name, arg}, headers);
            } else if (handler.type === 'streamer') {
                const streamId = createStreamId();

                const cleanup = () => {
                    clientApiState.finish(streamId);
                    cancelCleanup();
                };

                const cancelCleanup = context().onCancel(() => {
                    cleanup();
                });

                return new Stream(writer => {
                    run(async () => {
                        const channel = new Channel();
                        clientApiState.create(streamId, channel);

                        await server.stream({streamId, name, arg}, headers);
                        await channel.pipe(writer);
                    }).catch(error => {
                        cleanup();
                        logger.error(
                            `failed to start streaming ${name}`,
                            error
                        );
                    });

                    return () => {
                        cleanup();
                        server.cancel({streamId}).catch(error => {
                            logger.error('failed to cancel stream', error);
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
