import {z} from 'zod';
import {toCursor} from '../../cursor.js';
import {logger} from '../../logger.js';
import {Observable, Stream, toStream} from '../../stream.js';
import {assertNever} from '../../utils.js';
import {Message, MessageHeaders} from '../communication/message.js';
import {Connection} from '../communication/transport.js';
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
                const processor = api[req.name];
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

                return toStream(processor.observe(state, arg, headers)).flatMap(
                    ([value, updates]) => {
                        return toStream<ObservableItem<unknown, unknown>>([
                            {type: 'start', value},
                        ]).concat(
                            updates.map(update => ({type: 'update', update}))
                        );
                    }
                );
            },
        }),
    });
}

export function createRpcObserverClient<TApi extends ObserverApi<unknown>>(
    api: TApi,
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders
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
                return server.handle({name, arg}, headers);
            } else if (handler.type === 'streamer') {
                return server.stream({name, arg}, headers);
            } else if (handler.type === 'observer') {
                const stream = server.observe({name, arg}, headers) as Stream<
                    ObservableItem<unknown, unknown>
                >;
                return toObservable(stream);
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
