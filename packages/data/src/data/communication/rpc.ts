import {TypeOf, ZodObject, ZodType} from 'zod';
import {DeferredStream, DeferredStreamExecutor} from '../../async-stream.js';
import {RPC_TIMEOUT_MS, STREAM_ITEM_ACK_TIMEOUT_MS} from '../../constants.js';
import {Deferred} from '../../deferred.js';
import {BusinessError, getReadableError} from '../../errors.js';
import {assert, assertNever, Unsubscribe, wait} from '../../utils.js';
import {Uuid} from '../../uuid.js';
import {
    createMessageId,
    Message,
    MessageHeaders,
    MessageId,
    RequestMessage,
} from './message.js';
import {Connection} from './transport.js';

export interface Handler<TState, TRequest, TResponse> {
    type: 'handler';
    handle(state: TState, request: TRequest): Promise<TResponse>;
}

export type HandlerRequestSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, infer R, any> ? R : never;

export type HandlerResponseSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, any, infer R> ? R : never;

export interface HandlerOptions<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TResponseSchema extends ZodType<any, any, any>,
> {
    request: TRequestSchema;
    response: TResponseSchema;
    handle: (
        state: TState,
        request: TypeOf<TRequestSchema>
    ) => Promise<TypeOf<TResponseSchema>>;
}

export function handler<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TResponseSchema extends ZodType<any, any, any>,
>(
    options: HandlerOptions<TState, TRequestSchema, TResponseSchema>
): Handler<TState, TypeOf<TRequestSchema>, TypeOf<TResponseSchema>> {
    async function wrapper(state: TState, request: TypeOf<TRequestSchema>) {
        request = options.request.parse(request);
        const response = await options.handle(state, request);
        return options.response.parse(response);
    }

    return {
        type: 'handler' as const,
        handle: wrapper,
    };
}

export interface Streamer<TState, TRequest, TItem> {
    type: 'streamer';
    stream(state: TState, request: TRequest): AsyncIterable<TItem>;
}

export type StreamerRequestSchema<T extends Streamer<any, any, any>> =
    T extends Streamer<any, infer R, any> ? R : never;

export type StreamerItemSchema<T extends Streamer<any, any, any>> =
    T extends Streamer<any, any, infer R> ? R : never;

export interface StreamerOptions<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TItemSchema extends ZodType<any, any, any>,
> {
    request: TRequestSchema;
    item: TItemSchema;
    stream: (
        state: TState,
        request: TypeOf<TRequestSchema>
    ) => AsyncIterable<TypeOf<TItemSchema>>;
}

export function streamer<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TItemSchema extends ZodType<any, any, any>,
>(
    options: StreamerOptions<TState, TRequestSchema, TItemSchema>
): Streamer<TState, TypeOf<TRequestSchema>, TypeOf<TItemSchema>> {
    async function* wrapper(
        state: TState,
        request: TypeOf<TRequestSchema>
    ): AsyncIterable<TypeOf<TItemSchema>> {
        request = options.request.parse(request);
        for await (const item of options.stream(state, request)) {
            yield options.item.parse(item);
        }
    }
    return {
        type: 'streamer' as const,
        stream: wrapper,
    };
}

export type Api<TState> = Record<
    string,
    Handler<TState, any, any> | Streamer<TState, any, any>
>;

export function createApi<TState>(): <T extends Api<TState>>(def: T) => T {
    return def => def;
}

type ChangeApiState<TApi extends Api<any>, TNewState> = {
    [K in keyof TApi]: TApi[K] extends Streamer<any, infer R, infer I>
        ? Streamer<TNewState, R, I>
        : TApi[K] extends Handler<any, infer TReq, infer TRes>
          ? Handler<TNewState, TReq, TRes>
          : never;
};

export function apiStateAdapter<TStateA, TStateB, TApi extends Api<TStateA>>(
    api: TApi,
    adapter: (state: TStateB) => TStateA | Promise<TStateA>
): ChangeApiState<TApi, TStateB> {
    return wrapApi<TStateA, TStateB, TApi>(api, processor => {
        if (processor.type === 'handler') {
            return {
                type: 'handler',
                handle: async (state, request) =>
                    await processor.handle(await adapter(state), request),
            };
        } else if (processor.type === 'streamer') {
            return {
                type: 'streamer',
                stream: async function* (state, request) {
                    yield* processor.stream(await adapter(state), request);
                },
            };
        } else {
            assertNever(processor);
        }
    });
}

export function wrapApi<TStateA, TStateB, TApi extends Api<TStateA>>(
    def: TApi,
    decorator: (
        next: Handler<TStateA, unknown, any> | Streamer<TStateA, unknown, any>
    ) => Handler<TStateB, unknown, any> | Streamer<TStateB, unknown, any>
): ChangeApiState<TApi, TStateB> {
    const result: Api<any> = {};
    for (const key of Object.keys(def)) {
        result[key] = decorator(def[key]);
    }

    return result as any;
}

function handleMessageClient(
    conn: Connection<Message>,
    message: Message,
    unsub: Unsubscribe,
    executor: Deferred<any> | DeferredStreamExecutor<any>,
    requestId: Uuid
) {
    if (message.type === 'response' && message.requestId === requestId) {
        if (message.payload.type === 'error') {
            const errorMessage =
                'rpc call failed: ' +
                (message.payload.message ?? '<no message>');
            executor.reject(new Error(errorMessage));
            unsub();
        } else if (message.payload.type === 'success') {
            assert(executor instanceof Deferred);
            executor.resolve(message.payload.result);
            unsub();
        } else if (message.payload.type === 'item') {
            assert(!(executor instanceof Deferred));
            const itemId = message.id;
            executor
                .next(message.payload.item)
                .then(async () => {
                    await conn.send({
                        id: createMessageId(),
                        type: 'ack',
                        headers: {}, // todo: add headers
                        itemId,
                    });
                })
                .catch(error => {
                    console.error(
                        'error while pushing next stream item in RPC',
                        error
                    );
                });
        } else if (message.payload.type === 'end') {
            assert(!(executor instanceof Deferred));
            executor.end();
            unsub();
        } else {
            assertNever(message.payload);
        }
    }
}

export type InferRpcClient<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Streamer<any, infer TReq, infer TItem>
        ? (req: TReq) => AsyncIterable<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (req: TReq) => Promise<TRes>
          : never;
};

export function createRpcClient<TApi extends Api<any>>(
    api: TApi,
    connection: Connection<Message>,
    getHeaders: () => MessageHeaders
): InferRpcClient<TApi> {
    function get(nameOrSymbol: string | symbol) {
        if (typeof nameOrSymbol !== 'string') {
            throw new Error('rpc client supports only string methods');
        }
        const name = nameOrSymbol;

        const processor = api[name];

        if (!processor) {
            throw new Error(`unknown rpc endpoint: ${name}`);
        }

        async function listen(
            arg: any,
            executor: Deferred<any> | DeferredStreamExecutor<any>,
            requestId: MessageId
        ) {
            const unsub = connection.subscribe({
                next: async message => {
                    handleMessageClient(
                        connection,
                        message,
                        unsub,
                        executor,
                        requestId
                    );
                },
                close: async () => {
                    const error = new Error('connection to coordinator closed');
                    executor.reject(error);
                },
            });

            if (executor instanceof Deferred) {
                wait(RPC_TIMEOUT_MS)
                    .then(() => {
                        if (executor.state === 'pending') {
                            unsub();
                            executor.reject(
                                new Error('rpc call failed: timeout')
                            );
                        }
                    })
                    .catch(err => {
                        console.error(
                            'unexpected error after rpc timed out',
                            err
                        );
                    });
            }

            await connection.send({
                id: requestId,
                type: 'request',
                headers: getHeaders(),
                payload: {name, arg},
            });
        }

        return (arg: any) => {
            const requestId = createMessageId();
            if (processor.type === 'handler') {
                const result = new Deferred<any>();
                return (async () => {
                    await listen(arg, result, requestId);
                    return await result.promise;
                })();
            } else if (processor.type === 'streamer') {
                return new DeferredStream(executor => {
                    executor.cancellation
                        .then(() => {
                            return connection.send({
                                id: createMessageId(),
                                type: 'cancel',
                                requestId,
                                headers: {},
                            });
                        })
                        .catch(error => {
                            console.error('failed to cancel request: ', error);
                        });
                    listen(arg, executor, requestId).catch(error =>
                        executor.reject(error)
                    );
                });
            } else {
                assertNever(processor);
            }
        };
    }

    return new Proxy<any>({}, {get: (_target, name) => get(name)});
}

export type Transact<TState> = <TResult>(
    message: RequestMessage,
    fn: (state: TState) => Promise<TResult>
) => Promise<TResult>;

export interface ProcessorContext<TState> {
    message: Message;
    state: TState;
}

export function setupRpcServer<TState>(
    api: Api<ProcessorContext<TState>>,
    conn: Connection<Message>,
    state: TState
): void {
    conn.subscribe({
        next: async message => await handleMessageServer(message),
        close: async () => {
            runningStreams.forEach(streamId =>
                streamIdCancelQueue.add(streamId)
            );
        },
    });

    const streamIdCancelQueue = new Set<MessageId>();
    const runningStreams = new Set<MessageId>();

    async function handleMessageServer(message: Message) {
        if (message.type === 'request') {
            await handleRequest(message);
        } else if (message.type === 'response') {
            // nothing to do
        } else if (message.type === 'ack') {
            // nothing to do
        } else if (message.type === 'cancel') {
            streamIdCancelQueue.add(message.requestId);
        } else {
            assertNever(message);
        }
    }

    async function handleRequestHandler(
        handler: Handler<ProcessorContext<TState>, any, any>,
        message: RequestMessage
    ) {
        const result = await handler.handle(
            {message, state},
            message.payload.arg
        );
        await conn.send({
            id: createMessageId(),
            type: 'response',
            requestId: message.id,
            payload: {type: 'success', result},
        });
    }

    async function handleRequestStreamer(
        processor: Streamer<ProcessorContext<TState>, any, any>,
        message: RequestMessage
    ) {
        const streamId = message.id;
        runningStreams.add(streamId);
        try {
            for await (const item of processor.stream(
                {message, state},
                message.payload.arg
            )) {
                // we need to check at the beginning, because processor.stream might resolved
                // after connection already closed

                // note:
                //   because we check for cancellation only after stream yielded next item,
                //   we can optimize this part to stop waiting for process.stream after cancellation happened
                //   current situation:
                //     stream start
                //     stream item 1
                //     stream item 2
                //     stream item 3
                //     stream item 4
                //     stream item 5
                //     stream cancelled
                //     stream item 6
                //     stream closed
                if (streamIdCancelQueue.has(streamId)) {
                    // client requested finish of the stream
                    runningStreams.delete(streamId);
                    streamIdCancelQueue.delete(streamId);
                    break;
                }

                const itemMessageId = createMessageId();

                // we must subscribe before sending the message
                const ack = new Deferred<void>();
                const ackUnsub = conn.subscribe({
                    next: async message => {
                        if (
                            message.type === 'ack' &&
                            message.itemId === itemMessageId
                        ) {
                            ack.resolve();
                            ackUnsub();
                        }
                    },
                    close: async () => {
                        // do nothing
                    },
                });
                await conn.send({
                    id: itemMessageId,
                    type: 'response',
                    requestId: streamId,
                    payload: {type: 'item', item},
                });

                wait(STREAM_ITEM_ACK_TIMEOUT_MS)
                    .then(() => {
                        if (streamIdCancelQueue.has(streamId)) {
                            ack.resolve();
                        } else if (ack.state === 'pending') {
                            ack.reject(new Error('ack call failed: timeout'));
                        }
                    })
                    .catch(err => {
                        console.error(
                            'unexpected error after rpc timed out',
                            err
                        );
                    });

                await ack.promise;
            }

            if (runningStreams.has(streamId)) {
                await conn.send({
                    id: createMessageId(),
                    type: 'response',
                    requestId: streamId,
                    payload: {
                        type: 'end',
                    },
                });
            }
        } finally {
            runningStreams.delete(streamId);
        }
    }

    async function handleRequest(message: RequestMessage) {
        try {
            const processor = api[message.payload.name];
            if (processor.type === 'handler') {
                await handleRequestHandler(processor, message);
            } else if (processor.type === 'streamer') {
                await handleRequestStreamer(processor, message);
            }
        } catch (err: any) {
            if (err instanceof BusinessError) {
                console.warn(
                    '[WRN] Error during PRC handle:',
                    getReadableError(err)
                );
            } else {
                console.error('[ERR] Error during PRC handle:', err);
            }

            const errorMessage = getReadableError(err);

            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId: message.id,
                payload: {
                    type: 'error',
                    message: errorMessage,
                },
            });
        }
    }
}
