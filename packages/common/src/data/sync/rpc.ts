import {TypeOf, ZodObject} from 'zod';
import {RPC_TIMEOUT_MS} from '../../constants';
import {Deferred} from '../../deferred';
import {assertNever, wait} from '../../utils';
import {MessageHeaders, createMessageId} from './message';
import {Connection} from './transport';

interface Rpc<TRequest, TResponse> {
    (request: TRequest): Promise<TResponse>;
    ['~guard']: 'use rpc({...}) function instead';
}

interface RpcOptions<TType extends ZodObject<any, any, any>, TResponse> {
    schema: TType;
    handle: (request: TypeOf<TType>) => PromiseLike<TResponse>;
}

export function service<T extends Record<string, Rpc<any, any>>>(
    def: T
): {[K in keyof T]: (...args: Parameters<T[K]>) => ReturnType<T[K]>} {
    return def as any;
}

export function rpc<TType extends ZodObject<any, any, any>, TResponse>(
    options: RpcOptions<TType, TResponse>
): Rpc<TypeOf<TType>, TResponse> {
    return (async (request: TypeOf<TType>) => {
        request = options.schema.parse(request);
        return await options.handle(request);
    }) as Rpc<TypeOf<TType>, TResponse>;
}

export class RpcError extends Error {
    constructor(
        public readonly code: string,
        message?: string
    ) {
        super(message);
    }
}

export function createRpcClient(connection: Connection, getHeaders: () => MessageHeaders) {
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
                            if (ev.message.type === 'response' && ev.message.requestId === requestId) {
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

                    connection.send({
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
