import {TypeOf, ZodObject, ZodType} from 'zod';
import {RPC_TIMEOUT_MS} from '../../constants.js';
import {Deferred} from '../../deferred.js';
import {BusinessError, getReadableError} from '../../errors.js';
import {assertNever, Unsubscribe, wait} from '../../utils.js';
import {Uuid} from '../../uuid.js';
import {
    createMessageId,
    Message,
    MessageHeaders,
    RequestMessage,
} from './message.js';
import {Connection} from './transport.js';

export interface Handler<TState, TRequest, TResponse> {
    (state: TState, request: TRequest): Promise<TResponse>;
    // type: 'handler';
    ['~guard']: 'use handler({...}) function instead';
}

export interface Streamer<TState, TRequest, TItem> {
    (state: TState, request: TRequest): AsyncIterable<TItem>;
    // type: 'streamer';
    ['~guard']: 'use streamer({...}) function instead';
}

interface RpcOptions<
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

export type Api<TState> = Record<string, Handler<TState, any, any>>;

export function createApi<TState>(): <T extends Api<TState>>(def: T) => T {
    return def => def;
}

export type HandlerRequestSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, infer R, any> ? R : never;
export type HandlerResponseSchema<T extends Handler<any, any, any>> =
    T extends Handler<any, any, infer R> ? R : never;

type ChangeApiState<TApi extends Api<any>, TNewState> = {
    [K in keyof TApi]: Handler<
        TNewState,
        HandlerRequestSchema<TApi[K]>,
        HandlerResponseSchema<TApi[K]>
    >;
};

export function apiStateAdapter<TStateA, TStateB, TApi extends Api<TStateA>>(
    api: TApi,
    adapter: (state: TStateB) => TStateA
): ChangeApiState<TApi, TStateB> {
    const result: any = {};

    for (const key of Object.keys(api)) {
        result[key] = (state: TStateB, request: any) =>
            api[key](adapter(state), request);
    }

    return result;
}

export function wrapApi<TState, TApi extends Api<TState>>(
    def: TApi,
    decorator: (
        state: TState,
        request: unknown,
        next: Handler<TState, unknown, any>
    ) => Promise<any>
): TApi {
    const result: any = {};
    for (const key of Object.keys(def)) {
        result[key] = async (state: TState, request: any) => {
            return await decorator(state, request, def[key]);
        };
    }

    return result;
}

export function handler<
    TState,
    TRequestSchema extends ZodObject<any, any, any>,
    TResponseSchema extends ZodType<any, any, any>,
>(
    options: RpcOptions<TState, TRequestSchema, TResponseSchema>
): Handler<TState, TypeOf<TRequestSchema>, TypeOf<TResponseSchema>> {
    return (async (state: TState, request: TypeOf<TRequestSchema>) => {
        request = options.request.parse(request);
        const response = await options.handle(state, request);
        return options.response.parse(response);
    }) as Handler<TState, TypeOf<TRequestSchema>, TypeOf<TResponseSchema>>;
}

function handleMessage(
    message: Message,
    unsub: Unsubscribe,
    result: Deferred<any>,
    requestId: Uuid
) {
    if (message.type === 'response' && message.requestId === requestId) {
        try {
            if (message.payload.type === 'error') {
                const errorMessage =
                    'rpc call failed: ' +
                    (message.payload.message ?? '<no message>');
                result.reject(new Error(errorMessage));
            } else if (message.payload.type === 'success') {
                result.resolve(message.payload.result);
            } else {
                assertNever(message.payload);
            }
        } finally {
            unsub();
        }
    }
}

export type InferRpcClient<T extends Api<any>> = {
    [K in keyof T]: (
        req: TypeOf<HandlerRequestSchema<T[K]>>
    ) => Promise<HandlerResponseSchema<T[K]>>;
};

export function createRpcClient<TApi extends Api<any>>(
    api: TApi,
    connection: Connection<Message>,
    getHeaders: () => MessageHeaders
): InferRpcClient<TApi> {
    function get(name: string | symbol) {
        if (typeof name !== 'string') {
            throw new Error('rpc client supports only string methods');
        }

        return async (arg: any) => {
            const result = new Deferred<any>();
            const requestId = createMessageId();

            const unsub = connection.subscribe(ev => {
                if (ev.type === 'close') {
                    const error = new Error('connection to coordinator closed');
                    result.reject(error);
                } else if (ev.type === 'message') {
                    handleMessage(ev.message, unsub, result, requestId);
                } else {
                    assertNever(ev);
                }
            });

            wait(RPC_TIMEOUT_MS)
                .then(() => {
                    if (result.state === 'pending') {
                        unsub();
                        result.reject(new Error('rpc call failed: timeout'));
                    }
                })
                .catch(err => {
                    console.error('unexpected error after rpc timed out', err);
                });

            await connection.send({
                id: requestId,
                type: 'request',
                headers: getHeaders(),
                payload: {name, arg},
            });

            return result.promise;
        };
    }

    return new Proxy<any>({}, {get: (_target, name) => get(name)});
}

export type Transact<TState> = <TResult>(
    message: RequestMessage,
    fn: (state: TState) => Promise<TResult>
) => Promise<TResult>;

export function setupRpcServer<TState>(
    conn: Connection<Message>,
    api: Api<TState>,
    transact: Transact<TState>
): void {
    conn.subscribe(async ev => {
        try {
            if (ev.type === 'close') {
                // nothing to do
            } else if (ev.type === 'message') {
                await handleMessage(ev.message);
            } else {
                assertNever(ev);
            }
        } catch (err) {
            console.error('[ERR] unhandled error', err);
        }
    });

    async function handleMessage(message: Message) {
        if (message.type === 'request') {
            await handleRequest(message);
        } else if (message.type === 'response') {
            // nothing to do
        } else {
            assertNever(message);
        }
    }

    async function handleRequest(message: RequestMessage) {
        try {
            const result = await transact(message, async state => {
                return await api[message.payload.name](
                    state,
                    message.payload.arg as any
                );
            });
            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId: message.id,
                payload: {type: 'success', result},
            });
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
