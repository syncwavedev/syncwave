import {z} from 'zod';
import type {Brand} from '../utils.js';
import {createUuid, Uuid, zUuid} from '../uuid.js';

export function zRpcMessageId() {
    return zUuid<RpcMessageId>();
}

export type RpcMessageId = Brand<Uuid, 'rpc_message_id'>;

export function createRpcMessageId(): RpcMessageId {
    return createUuid() as RpcMessageId;
}

export function zRpcMessageHeaders() {
    return z.object({
        auth: z.string().optional(),
        traceparent: z.string(),
        tracestate: z.string(),
    });
}

export type MessageHeaders = z.infer<ReturnType<typeof zRpcMessageHeaders>>;

export function zBaseRpcMessage<TType extends string>(type: TType) {
    return z.object({
        type: z.literal(type),
        id: zRpcMessageId(),
        headers: zRpcMessageHeaders(),
    });
}

export function zRequestRpcMessage() {
    return zBaseRpcMessage('request').extend({
        payload: z.object({
            name: z.string(),
            arg: z.any(),
        }),
    });
}

export type RequestRpcMessage = z.infer<ReturnType<typeof zRequestRpcMessage>>;

export function zCancelRpcMessage() {
    return zBaseRpcMessage('cancel').extend({
        requestId: zRpcMessageId(),
        reason: z.string(),
    });
}

export type CancelRpcMessage = z.infer<ReturnType<typeof zCancelRpcMessage>>;

export function zBaseRpcResponsePayload<TType extends string>(type: TType) {
    return z.object({
        type: z.literal(type),
    });
}

export type BaseRpcResponsePayload<TType extends string> = z.infer<
    ReturnType<typeof zBaseRpcResponsePayload<TType>>
>;

export function zRpcSuccessResponsePayload() {
    return zBaseRpcResponsePayload('success').extend({
        result: z.unknown(),
    });
}

export type RpcSuccessResponsePayload = z.infer<
    ReturnType<typeof zRpcSuccessResponsePayload>
>;

export function zRpcErrorResponsePayload() {
    return zBaseRpcResponsePayload('error').extend({
        message: z.string(),
        code: z.string(),
    });
}

export type RpcErrorResponsePayload = z.infer<
    ReturnType<typeof zRpcErrorResponsePayload>
>;

export function zRpcResponsePayload() {
    return z.discriminatedUnion('type', [
        zRpcSuccessResponsePayload(),
        zRpcErrorResponsePayload(),
    ]);
}

export type RpcResponsePayload = z.infer<
    ReturnType<typeof zRpcResponsePayload>
>;

export function zResponseRpcMessage() {
    return zBaseRpcMessage('response').extend({
        requestId: zRpcMessageId(),
        payload: zRpcResponsePayload(),
    });
}

export type ResponseRpcMessage = z.infer<
    ReturnType<typeof zResponseRpcMessage>
>;

export function zRpcMessage() {
    return z.discriminatedUnion('type', [
        zRequestRpcMessage(),
        zCancelRpcMessage(),
        zResponseRpcMessage(),
    ]);
}

export type RpcMessage = z.infer<ReturnType<typeof zRpcMessage>>;
