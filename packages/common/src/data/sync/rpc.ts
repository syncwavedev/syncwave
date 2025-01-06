import {TypeOf, ZodObject} from 'zod';

interface Rpc<TRequest, TResponse> {
    (request: TRequest): Promise<TResponse>;
    ['~guard']: 'use rpc({...}) function instead';
}

interface RpcOptions<TType extends ZodObject<any, any, any>, TResponse> {
    schema: TType;
    handle: (request: TypeOf<TType>) => PromiseLike<TResponse> | TResponse;
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
