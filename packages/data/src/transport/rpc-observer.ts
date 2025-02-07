import {z} from 'zod';
import {RPC_CALL_TIMEOUT_MS} from '../constants.js';
import {context} from '../context.js';
import {toCursor} from '../cursor.js';
import {logger} from '../logger.js';
import {Observable, Stream, toStream} from '../stream.js';
import {Message, MessageHeaders} from '../transport/message.js';
import {Connection} from '../transport/transport.js';
import {assertNever, wait} from '../utils.js';
import {
    createRpcStreamerClient,
    launchRpcStreamerServer,
} from './rpc-streamer.js';
import {
    createApi,
    getRequiredProcessor,
    handler,
    Handler,
    InferRpcClient,
    Observer,
    streamer,
    Streamer,
} from './rpc.js';

export type ObserverApi<TState> = Record<
    string,
    | Handler<TState, unknown, unknown>
    | Streamer<TState, unknown, unknown>
    | Observer<TState, unknown, unknown, unknown>
>;

export function launchRpcObserverServer<T>(
    api: ObserverApi<T>,
    state: T,
    conn: Connection<Message>
) {
    launchRpcStreamerServer(createRpcObserverServerApi(api), state, conn);
}

function createRpcObserverServerApi<TState>(api: ObserverApi<TState>) {
    return createApi<TState>()({
        handle: handler({
            req: z.object({name: z.string(), arg: z.unknown()}),
            res: z.unknown(),
            handle: async (state, req, headers) => {
                const processor = getRequiredProcessor(api, req.name);
                if (processor.type !== 'handler') {
                    throw new Error('processor must be a handler');
                }

                return await processor.handle(state, req.arg, headers);
            },
        }),
        stream: streamer({
            req: z.object({name: z.string(), arg: z.unknown()}),
            item: z.unknown(),
            stream: (state, {name, arg}, headers) => {
                const processor = getRequiredProcessor(api, name);
                if (processor.type !== 'streamer') {
                    throw new Error('processor must be a streamer');
                }

                return processor.stream(state, arg, headers);
            },
        }),
        observe: streamer({
            req: z.object({name: z.string(), arg: z.unknown()}),
            item: z.discriminatedUnion('type', [
                z.object({
                    type: z.literal('start'),
                    value: z.unknown(),
                }),
                z.object({
                    type: z.literal('update'),
                    update: z.unknown(),
                }),
            ]),
            stream: (state, {name, arg}, headers) => {
                const processor = getRequiredProcessor(api, name);
                if (processor.type !== 'observer') {
                    throw new Error('processor must be an observer');
                }

                const [ctx, cancelCtx] = context().createChild();
                let resolved = false;

                wait({ms: RPC_CALL_TIMEOUT_MS, onCancel: 'resolve'})
                    .then(() => {
                        if (!resolved) {
                            cancelCtx();
                        }
                    })
                    .catch(error => {
                        logger.error(
                            'unexpected error during rpc observer cancellation',
                            error
                        );
                    });

                return ctx.run(() =>
                    toStream(processor.observe(state, arg, headers)).flatMap(
                        ([value, updates]) => {
                            resolved = true;
                            return toStream<ObservableItem<unknown, unknown>>([
                                {type: 'start', value},
                            ]).concat(
                                updates.map(update => ({
                                    type: 'update',
                                    update,
                                }))
                            );
                        }
                    )
                );
            },
        }),
    });
}

export function createRpcObserverClient<TApi extends ObserverApi<unknown>>(
    api: TApi,
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders,
    logLatency: boolean
): InferRpcClient<TApi> {
    const server = createRpcStreamerClient(
        createRpcObserverServerApi(api),
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
            // validate argument
            arg = handler.req.parse(arg);

            if (handler.type === 'handler') {
                const start = performance.now();
                return server.handle({name, arg}, headers).finally(() => {
                    const elapsed = performance.now() - start;
                    if (logLatency) {
                        logger.info(
                            `${name}(${JSON.stringify(
                                arg
                            )}) took ${elapsed.toFixed(2)}ms`
                        );
                    }
                });
            } else if (handler.type === 'streamer') {
                return server.stream({name, arg}, headers);
            } else if (handler.type === 'observer') {
                const start = performance.now();
                const stream = server.observe({name, arg}, headers) as Stream<
                    ObservableItem<unknown, unknown>
                >;
                return toObservable(stream).finally(() => {
                    const elapsed = performance.now() - start;
                    if (logLatency) {
                        logger.info(
                            `${name}(${JSON.stringify(
                                arg
                            )}) took ${elapsed.toFixed(2)}ms`
                        );
                    }
                });
            } else {
                assertNever(handler);
            }
        };
    }

    return new Proxy<any>({}, {get});
}

export type ObservableItem<TValue, TUpdate> =
    | {type: 'start'; value: TValue}
    | {type: 'update'; update: TUpdate};

export async function toObservable<TValue, TUpdate>(
    source: AsyncIterable<ObservableItem<TValue, TUpdate>>
): Observable<TValue, TUpdate> {
    const iterator = source[Symbol.asyncIterator]();

    const firstResult = await iterator.next();
    if (firstResult.done) {
        throw new Error("Source iterable is empty; expected a 'start' event.");
    }
    if (firstResult.value.type !== 'start') {
        throw new Error("Expected the first event to be 'start'.");
    }
    const initialValue = firstResult.value.value;

    async function* updates(): AsyncGenerator<TUpdate> {
        try {
            while (true) {
                const result = await iterator.next();
                if (result.done) {
                    return;
                }
                const event = result.value;
                if (event.type === 'update') {
                    yield event.update;
                } else {
                    throw new Error(`Unexpected event type: ${event.type}`);
                }
            }
        } finally {
            if (typeof iterator.return === 'function') {
                try {
                    await iterator.return();
                } catch (error) {
                    logger.error('transformAsyncIterable finally', error);
                }
            }
        }
    }

    return [initialValue, toCursor(updates())];
}
