import {Type} from '@sinclair/typebox';
import {decodeMsgpack, encodeMsgpack} from '../codec.js';
import {RPC_CHUNK_SIZE} from '../constants.js';
import {context} from '../context.js';
import type {Authenticator} from '../data/auth.js';
import {AppError, CancelledError} from '../errors.js';
import {log} from '../logger.js';
import {toStream, type Stream} from '../stream.js';
import {checkValue} from '../type.js';
import {assertNever, joinBuffers, type Unsubscribe} from '../utils.js';
import type {MessageHeaders} from './rpc-message.js';
import {
    createRpcStreamerClient,
    launchRpcStreamerServer,
    type StreamerApi,
} from './rpc-streamer.js';
import {RpcConnection} from './rpc-transport.js';
import {createApi, streamer, type InferRpcClient} from './rpc.js';
import {type Connection} from './transport.js';

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

                if (handler.type !== 'handler') {
                    throw new AppError(
                        `rpc endpoint ${method} is not a handler`
                    );
                }

                const result = await handler.handle(state, arg, ctx);
                yield* chunkBuffer(encodeMsgpack(result), RPC_CHUNK_SIZE);
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

                for await (const item of handler.stream(state, arg, ctx)) {
                    yield* chunkBuffer(encodeMsgpack(item), RPC_CHUNK_SIZE);
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
                log.error({
                    error,
                    msg: `invalid request for ${name}` + JSON.stringify(arg),
                });

                throw error;
            }

            if (handler.type === 'handler') {
                return server
                    .handle({method: name, arg}, headers)
                    .reduce<Uint8Array[]>((acc, {chunk}) => {
                        acc.push(chunk);
                        return acc;
                    }, [])
                    .then(chunks => decodeMsgpack(joinBuffers(chunks)));
            } else if (handler.type === 'streamer') {
                return toStream(
                    transformStream(server.stream({method: name, arg}, headers))
                ).map(item => decodeMsgpack(item));
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
