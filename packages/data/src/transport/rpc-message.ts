import {Type, type Static} from '@sinclair/typebox';
import type {Brand} from '../utils.js';
import {createUuid, Uuid} from '../uuid.js';

export function zRpcMessageId() {
    return Uuid<RpcMessageId>();
}

export type RpcMessageId = Brand<Uuid, 'rpc_message_id'>;

export function createRpcMessageId(): RpcMessageId {
    return createUuid() as RpcMessageId;
}

export function zRpcMessageHeaders() {
    return Type.Object({
        auth: Type.Optional(Type.String()),
        traceparent: Type.String(),
        tracestate: Type.String(),
    });
}

export interface MessageHeaders
    extends Static<ReturnType<typeof zRpcMessageHeaders>> {}

export function zBaseRpcMessage<TType extends string>(type: TType) {
    return Type.Object({
        type: Type.Literal(type),
        id: zRpcMessageId(),
        headers: zRpcMessageHeaders(),
    });
}

export function zRequestRpcMessage() {
    return Type.Composite([
        zBaseRpcMessage('request'),
        Type.Object({
            payload: Type.Object({
                name: Type.String(),
                arg: Type.Any(),
            }),
        }),
    ]);
}

export interface RequestRpcMessage
    extends Static<ReturnType<typeof zRequestRpcMessage>> {}

export function zCancelRpcMessage() {
    return Type.Composite([
        zBaseRpcMessage('cancel'),
        Type.Object({
            requestId: zRpcMessageId(),
            reason: Type.String(),
        }),
    ]);
}

export interface CancelRpcMessage
    extends Static<ReturnType<typeof zCancelRpcMessage>> {}

export function zBaseRpcResponsePayload<TType extends string>(type: TType) {
    return Type.Object({
        type: Type.Literal(type),
    });
}

export type BaseRpcResponsePayload<TType extends string> = Static<
    ReturnType<typeof zBaseRpcResponsePayload<TType>>
>;

export function zRpcSuccessResponsePayload() {
    return Type.Composite([
        zBaseRpcResponsePayload('success'),
        Type.Object({
            result: Type.Unknown(),
        }),
    ]);
}

export interface RpcSuccessResponsePayload
    extends Static<ReturnType<typeof zRpcSuccessResponsePayload>> {}

export function zRpcErrorResponsePayload() {
    return Type.Composite([
        zBaseRpcResponsePayload('error'),
        Type.Object({
            message: Type.String(),
            code: Type.String(),
        }),
    ]);
}

export interface RpcErrorResponsePayload
    extends Static<ReturnType<typeof zRpcErrorResponsePayload>> {}

export function zRpcResponsePayload() {
    return Type.Union([
        zRpcSuccessResponsePayload(),
        zRpcErrorResponsePayload(),
    ]);
}

export type RpcResponsePayload = Static<ReturnType<typeof zRpcResponsePayload>>;

export function zResponseRpcMessage() {
    return Type.Composite([
        zBaseRpcMessage('response'),
        Type.Object({
            requestId: zRpcMessageId(),
            payload: zRpcResponsePayload(),
        }),
    ]);
}

export interface ResponseRpcMessage
    extends Static<ReturnType<typeof zResponseRpcMessage>> {}

export function zRpcMessage() {
    return Type.Union([
        zRequestRpcMessage(),
        zCancelRpcMessage(),
        zResponseRpcMessage(),
    ]);
}

export type RpcMessage = Static<ReturnType<typeof zRpcMessage>>;
