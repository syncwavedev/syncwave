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

function handleMessage(
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
            executor: Deferred<any> | DeferredStreamExecutor<any>
        ) {
            const requestId = createMessageId();

            const unsub = connection.subscribe(ev => {
                if (ev.type === 'close') {
                    const error = new Error('connection to coordinator closed');
                    executor.reject(error);
                } else if (ev.type === 'message') {
                    handleMessage(
                        connection,
                        ev.message,
                        unsub,
                        executor,
                        requestId
                    );
                } else {
                    assertNever(ev);
                }
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
            if (processor.type === 'handler') {
                const result = new Deferred<any>();
                return (async () => {
                    await listen(arg, result);
                    return await result.promise;
                })();
            } else if (processor.type === 'streamer') {
                return new DeferredStream(executor => {
                    listen(arg, executor).catch(error =>
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
    conn.subscribe(async ev => {
        try {
            if (ev.type === 'close') {
                runningStreams.forEach(streamId =>
                    streamIdFinishQueue.add(streamId)
                );
            } else if (ev.type === 'message') {
                await handleMessage(ev.message);
            } else {
                assertNever(ev);
            }
        } catch (err) {
            console.error('[ERR] unhandled error', err);
        }
    });

    const streamIdFinishQueue = new Set<MessageId>();
    const runningStreams = new Set<MessageId>();

    async function handleMessage(message: Message) {
        if (message.type === 'request') {
            await handleRequest(message);
        } else if (message.type === 'response') {
            // nothing to do
        } else if (message.type === 'ack') {
            // nothing to do
        } else if (message.type === 'finish') {
            streamIdFinishQueue.add(message.streamId);
        } else {
            assertNever(message);
        }
    }

    async function handleRequest(message: RequestMessage) {
        try {
            const processor = api[message.payload.name];
            const req = message.payload.arg;
            if (processor.type === 'handler') {
                const result = await processor.handle({message, state}, req);
                await conn.send({
                    id: createMessageId(),
                    type: 'response',
                    requestId: message.id,
                    payload: {type: 'success', result},
                });
            } else if (processor.type === 'streamer') {
                runningStreams.add(message.id);
                try {
                    for await (const item of processor.stream(
                        {message, state},
                        req
                    )) {
                        // we need to check at the beginning, because processor.stream might resolved
                        // after connection already closed
                        if (streamIdFinishQueue.has(message.id)) {
                            // client requested finish of the stream
                            streamIdFinishQueue.delete(message.id);
                            break;
                        }

                        const itemMessageId = createMessageId();

                        // we must subscribe before sending the message
                        const ack = new Deferred<void>();
                        const ackUnsub = conn.subscribe(ev => {
                            if (
                                ev.type === 'message' &&
                                ev.message.type === 'ack' &&
                                ev.message.itemId === itemMessageId
                            ) {
                                ack.resolve();
                                ackUnsub();
                            }
                        });
                        await conn.send({
                            id: itemMessageId,
                            type: 'response',
                            requestId: message.id,
                            // streamId is id of the request message
                            payload: {type: 'item', item, streamId: message.id},
                        });

                        wait(STREAM_ITEM_ACK_TIMEOUT_MS)
                            .then(() => {
                                if (streamIdFinishQueue.has(message.id)) {
                                    ack.resolve();
                                } else if (ack.state === 'pending') {
                                    ack.reject(
                                        new Error('ack call failed: timeout')
                                    );
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
                } finally {
                    runningStreams.delete(message.id);
                }
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
