import {TypeOf, ZodObject, ZodType} from 'zod';
import {DeferredStream, DeferredStreamExecutor} from '../../async-stream.js';
import {RPC_ACK_TIMEOUT_MS, RPC_CALL_TIMEOUT_MS} from '../../constants.js';
import {Deferred} from '../../deferred.js';
import {BusinessError, getReadableError} from '../../errors.js';
import {JobTracker} from '../../job-tracker.js';
import {
    assertNever,
    Cancellation,
    CancellationSource,
    wait,
} from '../../utils.js';
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
    handle(
        state: TState,
        request: TRequest,
        cx: Cancellation
    ): Promise<TResponse>;
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
    req: TRequestSchema;
    res: TResponseSchema;
    handle: (
        state: TState,
        request: TypeOf<TRequestSchema>,
        cx: Cancellation
    ) => Promise<TypeOf<TResponseSchema>>;
}

export function handler<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TResponseSchema extends ZodType<any, any, any>,
>(
    options: HandlerOptions<TState, TRequestSchema, TResponseSchema>
): Handler<TState, TypeOf<TRequestSchema>, TypeOf<TResponseSchema>> {
    async function wrapper(
        state: TState,
        request: TypeOf<TRequestSchema>,
        cx: Cancellation
    ) {
        request = options.req.parse(request);
        const res = await options.handle(state, request, cx);
        return options.res.parse(res);
    }

    return {
        type: 'handler' as const,
        handle: wrapper,
    };
}

export interface Streamer<TState, TRequest, TItem> {
    type: 'streamer';
    stream(
        state: TState,
        req: TRequest,
        cx: Cancellation
    ): AsyncIterable<TItem>;
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
        req: TypeOf<TRequestSchema>,
        cx: Cancellation
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
        req: TypeOf<TRequestSchema>,
        cx: Cancellation
    ): AsyncIterable<TypeOf<TItemSchema>> {
        req = options.request.parse(req);
        for await (const item of options.stream(state, req, cx)) {
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
                handle: async (state, request, cx) =>
                    await processor.handle(await adapter(state), request, cx),
            };
        } else if (processor.type === 'streamer') {
            return {
                type: 'streamer',
                stream: async function* (state, request, cx) {
                    yield* processor.stream(await adapter(state), request, cx);
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

export type InferRpcClient<T extends Api<any>> = {
    [K in keyof T]: T[K] extends Streamer<any, infer TReq, infer TItem>
        ? (req: TReq) => AsyncIterable<TItem>
        : T[K] extends Handler<any, infer TReq, infer TRes>
          ? (req: TReq) => Promise<TRes>
          : never;
};

export function createRpcClient<TApi extends Api<any>>(
    api: TApi,
    conn: Connection<Message>,
    getHeaders: () => MessageHeaders
): InferRpcClient<TApi> {
    async function listenStreamer(
        exe: DeferredStreamExecutor<any>,
        name: string,
        arg: any
    ) {
        const requestId = createMessageId();

        let started = false;

        const timeoutCxs = new CancellationSource();
        const unsub = conn.subscribe({
            next: async msg => {
                if (msg.type !== 'response' || msg.requestId !== requestId) {
                    return;
                }

                timeoutCxs.cancel();

                if (msg.payload.type === 'error') {
                    if (!started) {
                        exe.throw(new Error("got 'error' before start"));
                    }
                    exe.throw(
                        new Error(
                            'rpc call failed: ' +
                                (msg.payload.message ?? '<no message>')
                        )
                    );
                    unsub();
                } else if (msg.payload.type === 'success') {
                    exe.throw(
                        new Error("unexpected 'success' message for stream")
                    );
                    unsub();
                } else if (msg.payload.type === 'item') {
                    if (!started) {
                        exe.throw(new Error("got 'item' before start"));
                    }
                    const itemId = msg.id;
                    await exe.next(msg.payload.item);

                    await conn.send({
                        id: createMessageId(),
                        type: 'ack',
                        headers: getHeaders(),
                        itemId,
                    });
                } else if (msg.payload.type === 'end') {
                    if (!started) {
                        exe.throw(new Error("got 'end' before start"));
                    }
                    exe.end();
                    unsub();
                } else if (msg.payload.type === 'start') {
                    if (started) {
                        exe.throw(new Error('stream started twice'));
                        unsub();
                    } else {
                        started = true;
                    }
                } else {
                    assertNever(msg.payload);
                }
            },
            reconnect: async () => {
                timeoutCxs.cancel();
                exe.throw(
                    new Error('connection to coordinator lost [reconnect]')
                );
                unsub();
            },
            close: async () => {
                timeoutCxs.cancel();
                exe.throw(new Error('connection to coordinator lost [close]'));
                unsub();
            },
        });

        try {
            await conn.send({
                id: requestId,
                type: 'request',
                headers: getHeaders(),
                payload: {name, arg},
            });
        } catch (error) {
            exe.throw(error);
        }

        wait(RPC_CALL_TIMEOUT_MS, timeoutCxs.cancellation)
            .then(() => {
                if (!started) {
                    exe.throw(new Error('stream failed to start: timeout'));
                    unsub();
                }
            })
            .catch(err => {
                console.error('unexpected error after rpc timed out', err);
            });

        exe.cx
            .then(() =>
                conn.send({
                    id: createMessageId(),
                    type: 'cancel',
                    requestId,
                    headers: {},
                })
            )
            .catch(error => {
                console.error('failed to cancel request: ', error);
            });
    }

    async function listenHandler(name: string, arg: any) {
        const result = new Deferred<any>();
        const requestId = createMessageId();
        const timeoutCxs = new CancellationSource();

        const unsub = conn.subscribe({
            next: async msg => {
                if (!(msg.type === 'response' && msg.requestId === requestId)) {
                    return;
                }
                timeoutCxs.cancel();
                if (msg.payload.type === 'error') {
                    result.reject(
                        new Error(
                            'rpc call failed: ' +
                                (msg.payload.message ?? '<no message>')
                        )
                    );
                    unsub();
                } else if (msg.payload.type === 'success') {
                    result.resolve(msg.payload.result);
                    unsub();
                } else if (msg.payload.type === 'item') {
                    result.reject(
                        new Error("unexpected 'item' message for handler")
                    );
                    unsub();
                } else if (msg.payload.type === 'end') {
                    result.reject(
                        new Error("unexpected 'end' message for handler")
                    );
                    unsub();
                } else if (msg.payload.type === 'start') {
                    result.reject(
                        new Error("unexpected 'start' message for handler")
                    );
                    unsub();
                } else {
                    assertNever(msg.payload);
                }
            },
            reconnect: async () => {
                timeoutCxs.cancel();
                result.reject(
                    new Error('connection to coordinator lost [reconnect]')
                );
                unsub();
            },
            close: async () => {
                timeoutCxs.cancel();
                result.reject(
                    new Error('connection to coordinator lost [close]')
                );
                unsub();
            },
        });

        wait(RPC_CALL_TIMEOUT_MS, timeoutCxs.cancellation)
            .then(() => {
                if (result.state === 'pending') {
                    result.reject(new Error('rpc call failed: timeout'));
                    unsub();
                }
            })
            .catch(err => {
                console.error('unexpected error after rpc timed out', err);
            });

        await conn.send({
            id: requestId,
            type: 'request',
            headers: getHeaders(),
            payload: {name, arg},
        });

        return await result.promise;
    }

    function get(nameOrSymbol: string | symbol) {
        if (typeof nameOrSymbol !== 'string') {
            throw new Error('rpc client supports only string methods');
        }
        const name = nameOrSymbol;

        const processor = api[name];
        if (!processor) {
            throw new Error(`unknown rpc endpoint: ${name}`);
        }

        return (arg: any) => {
            if (processor.type === 'handler') {
                return listenHandler(name, arg);
            } else if (processor.type === 'streamer') {
                return new DeferredStream(executor => {
                    listenStreamer(executor, name, arg).catch(error =>
                        executor.throw(error)
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
async function waitMessage<S extends Message>(
    conn: Connection<Message>,
    predicate: (message: Message) => message is S,
    timeoutMs: number
): Promise<S | undefined>;
async function waitMessage(
    conn: Connection<Message>,
    predicate: (message: Message) => boolean,
    timeoutMs: number
): Promise<Message | undefined>;
async function waitMessage<S extends Message>(
    conn: Connection<Message>,
    predicate:
        | ((message: Message) => message is Message)
        | ((message: Message) => boolean),
    timeoutMs: number
): Promise<S | undefined> {
    const result = new Deferred<S | undefined>();
    const timeoutCxs = new CancellationSource();
    const unsub = conn.subscribe({
        next: async message => {
            if (predicate(message)) {
                result.resolve(message as any);
                timeoutCxs.cancel();
                unsub();
            }
        },
        reconnect: async () => {
            timeoutCxs.cancel();
            result.resolve(undefined);
            unsub();
        },
        close: async () => {
            timeoutCxs.cancel();
            result.resolve(undefined);
            unsub();
        },
    });

    wait(timeoutMs, timeoutCxs.cancellation)
        .then(() => {
            if (result.state === 'pending') {
                result.reject(new Error(`timeout after ${timeoutMs}`));
            }
        })
        .catch(err => {
            console.error('unexpected error after timed out', err);
        });

    return await result.promise;
}

export function setupRpcServer<TState>(
    api: Api<ProcessorContext<TState>>,
    conn: Connection<Message>,
    state: TState
): void {
    // we use requestId as stream id
    const streamsTracker = new JobTracker<MessageId>();
    const cxs = new CancellationSource();

    conn.subscribe({
        next: message => handleMessageServer(message),
        reconnect: async () => {
            streamsTracker.cancelAll();
            cxs.cancel();
        },
        close: async () => {
            streamsTracker.cancelAll();
            cxs.cancel();
        },
    });

    async function handleMessageServer(message: Message) {
        if (message.type === 'request') {
            await handleRequest(message);
        } else if (message.type === 'response') {
            // do nothing
        } else if (message.type === 'ack') {
            // nothing to do
        } else if (message.type === 'cancel') {
            streamsTracker.cancel(message.requestId);
        } else {
            assertNever(message);
        }
    }

    async function handleRequestHandler(
        handler: Handler<ProcessorContext<TState>, any, any>,
        msg: RequestMessage
    ) {
        const result = await handler.handle(
            {message: msg, state},
            msg.payload.arg,
            cxs.cancellation
        );
        await conn.send({
            id: createMessageId(),
            type: 'response',
            requestId: msg.id,
            payload: {type: 'success', result},
        });
    }

    async function handleRequestStreamer(
        processor: Streamer<ProcessorContext<TState>, any, any>,
        msg: RequestMessage
    ) {
        const requestId = msg.id;
        streamsTracker.start(requestId);
        try {
            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId,
                payload: {type: 'start'},
            });

            for await (const item of processor.stream(
                {message: msg, state},
                msg.payload.arg,
                cxs.cancellation
            )) {
                // we need to check at the beginning, because processor.stream might resolved
                // after connection has already closed
                if (!streamsTracker.isRunning(requestId)) {
                    break;
                }

                const itemMessageId = createMessageId();

                // we must subscribe for an ack before sending the message
                const ack = waitMessage(
                    conn,
                    msg => msg.type === 'ack' && msg.itemId === itemMessageId,
                    RPC_ACK_TIMEOUT_MS
                );

                await conn.send({
                    id: itemMessageId,
                    type: 'response',
                    requestId,
                    payload: {type: 'item', item},
                });

                await ack;
            }

            if (streamsTracker.isRunning(requestId)) {
                await conn.send({
                    id: createMessageId(),
                    type: 'response',
                    requestId,
                    payload: {type: 'end'},
                });
            }
        } finally {
            streamsTracker.finish(requestId);
        }
    }

    async function handleRequest(msg: RequestMessage) {
        try {
            const processor = api[msg.payload.name];
            if (processor.type === 'handler') {
                await handleRequestHandler(processor, msg);
            } else if (processor.type === 'streamer') {
                await handleRequestStreamer(processor, msg);
            } else {
                assertNever(processor);
            }
        } catch (err: any) {
            if (err instanceof BusinessError) {
                console.warn(
                    '[WRN] Error during RPC handle:',
                    getReadableError(err)
                );
            } else {
                console.error('[ERR] Error during RPC handle:', err);
            }

            const errorMessage = getReadableError(err);

            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId: msg.id,
                payload: {
                    type: 'error',
                    message: errorMessage,
                },
            });
        }
    }
}
