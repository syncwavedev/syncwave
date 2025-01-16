import {TypeOf, ZodObject} from 'zod';
import {RPC_TIMEOUT_MS} from '../../constants';
import {Deferred} from '../../deferred';
import {assertNever, wait} from '../../utils';
import {Message, MessageHeaders, RequestMessage, createMessageId} from './message';
import {Connection} from './transport';

export interface Handler<TRequest, TResponse> {
    (request: TRequest): Promise<TResponse>;
    ['~guard']: 'use handler({...}) function instead';
}

interface RpcOptions<TType extends ZodObject<any, any, any>, TResponse> {
    schema: TType;
    handle: (request: TypeOf<TType>) => Promise<TResponse>;
}

export type Api = Record<string, Handler<any, any>>;

export function createApi<T extends Api>(def: T): T {
    return def;
}

export function handler<TType extends ZodObject<any, any, any>, TResponse>(
    options: RpcOptions<TType, TResponse>
): Handler<TypeOf<TType>, TResponse> {
    return (async (request: TypeOf<TType>) => {
        request = options.schema.parse(request);
        return await options.handle(request);
    }) as Handler<TypeOf<TType>, TResponse>;
}

export class RpcError extends Error {
    constructor(
        public readonly code: string,
        message?: string
    ) {
        super(message);
    }
}

export function createRpcClient<T = any>(connection: Connection<Message>, getHeaders: () => MessageHeaders): T {
    return new Proxy<any>(
        {},
        {
            get(_target, name) {
                if (typeof name !== 'string') {
                    throw new Error('rpc client supports only string methods');
                }

                return async (arg: any) => {
                    const result = new Deferred<any>();

                    const requestId = createMessageId();

                    const unsub = connection.subscribe(ev => {
                        if (ev.type === 'close') {
                            result.reject(new Error('connection to coordinator closed'));
                        } else if (ev.type === 'message') {
                            if (ev.message.type === 'response' && ev.message.requestId.equals(requestId)) {
                                try {
                                    if (ev.message.payload.type === 'error') {
                                        result.reject(
                                            new Error(
                                                'rpc call failed: ' + (ev.message.payload.message ?? '<no message>')
                                            )
                                        );
                                    } else if (ev.message.payload.type === 'success') {
                                        result.resolve(ev.message.payload.result);
                                    } else {
                                        assertNever(ev.message.payload);
                                    }
                                } finally {
                                    unsub();
                                }
                            }
                        } else {
                            assertNever(ev);
                        }
                    });

                    wait(RPC_TIMEOUT_MS).then(() => {
                        if (result.state === 'pending') {
                            unsub();
                            result.reject(new Error('rpc call failed: timeout'));
                        }
                    });

                    await connection.send({
                        id: requestId,
                        type: 'request',
                        headers: getHeaders(),
                        payload: {name, arg},
                    });

                    return result.promise;
                };
            },
        }
    );
}

export function setupRpcServer<TState>(
    conn: Connection<Message>,
    createApi: (state: TState) => Api,
    transact: (message: RequestMessage, fn: (state: TState) => Promise<void>) => Promise<void>
): void {
    conn.subscribe(async ev => {
        if (ev.type === 'close') {
            // nothing to do
        } else if (ev.type === 'message') {
            await handleMessage(ev.message);
        } else {
            assertNever(ev);
        }
    });

    async function handleMessage(message: Message) {
        if (message.type === 'request') {
            await transact(message, async ctx => {
                await handleRequest(ctx, conn, message);
            });
        } else if (message.type === 'response') {
            // nothing to do
        } else {
            assertNever(message);
        }
    }

    async function handleRequest(txn: TState, conn: Connection<Message>, message: RequestMessage) {
        const server = createApi(txn);

        try {
            const result = await server[message.payload.name](message.payload.arg as any);
            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId: message.id,
                payload: {type: 'success', result},
            });
        } catch (err: any) {
            console.error(err);

            const errorMessage = typeof (err ?? {})['message'] === 'string' ? err['message'] : undefined;
            const responseMessage = `${err?.constructor.name ?? '<null>'}: ${errorMessage ?? '<null>'}`;

            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId: message.id,
                payload: {
                    type: 'error',
                    message: process.env.NODE_ENV === 'development' ? responseMessage : undefined,
                },
            });
        }
    }
}
