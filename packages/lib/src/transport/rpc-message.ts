import {Type, type Static} from '@sinclair/typebox';
import {TransactionId} from '../transaction-id.js';
import type {Brand} from '../utils.js';
import {createUuid, Uuid} from '../uuid.js';

export function RpcMessageId() {
    return Uuid<RpcMessageId>();
}

export type RpcMessageId = Brand<Uuid, 'rpc_message_id'>;

export function createRpcMessageId(): RpcMessageId {
    return createUuid() as RpcMessageId;
}

export function RpcMessageHeaders() {
    return Type.Object({
        auth: Type.Optional(Type.String()),
        transactionId: Type.Optional(TransactionId()),
        traceparent: Type.String(),
        tracestate: Type.String(),
    });
}

export interface MessageHeaders
    extends Static<ReturnType<typeof RpcMessageHeaders>> {}

export function BaseRpcMessage<TType extends string>(type: TType) {
    return Type.Object({
        type: Type.Literal(type),
        id: RpcMessageId(),
        headers: RpcMessageHeaders(),
    });
}

export function RequestRpcMessage() {
    return Type.Composite([
        BaseRpcMessage('request'),
        Type.Object({
            payload: Type.Object({
                name: Type.String(),
                arg: Type.Any(),
            }),
        }),
    ]);
}

export interface RequestRpcMessage
    extends Static<ReturnType<typeof RequestRpcMessage>> {}

export function CancelRpcMessage() {
    return Type.Composite([
        BaseRpcMessage('cancel'),
        Type.Object({
            requestId: RpcMessageId(),
            reason: Type.String(),
        }),
    ]);
}

export interface CancelRpcMessage
    extends Static<ReturnType<typeof CancelRpcMessage>> {}

export function BaseRpcResponsePayload<TType extends string>(type: TType) {
    return Type.Object({
        type: Type.Literal(type),
    });
}

export type BaseRpcResponsePayload<TType extends string> = Static<
    ReturnType<typeof BaseRpcResponsePayload<TType>>
>;

export function RpcSuccessResponsePayload() {
    return Type.Composite([
        BaseRpcResponsePayload('success'),
        Type.Object({
            result: Type.Unknown(),
        }),
    ]);
}

export interface RpcSuccessResponsePayload
    extends Static<ReturnType<typeof RpcSuccessResponsePayload>> {}

export function RpcErrorResponsePayload() {
    return Type.Composite([
        BaseRpcResponsePayload('error'),
        Type.Object({
            message: Type.String(),
            code: Type.String(),
            errorId: Uuid(),
        }),
    ]);
}

export interface RpcErrorResponsePayload
    extends Static<ReturnType<typeof RpcErrorResponsePayload>> {}

export function RpcResponsePayload() {
    return Type.Union([RpcSuccessResponsePayload(), RpcErrorResponsePayload()]);
}

export type RpcResponsePayload = Static<ReturnType<typeof RpcResponsePayload>>;

export function ResponseRpcMessage() {
    return Type.Composite([
        BaseRpcMessage('response'),
        Type.Object({
            requestId: RpcMessageId(),
            payload: RpcResponsePayload(),
        }),
    ]);
}

export interface ResponseRpcMessage
    extends Static<ReturnType<typeof ResponseRpcMessage>> {}

export function RpcMessage() {
    return Type.Union([
        RequestRpcMessage(),
        CancelRpcMessage(),
        ResponseRpcMessage(),
    ]);
}

export type RpcMessage = Static<ReturnType<typeof RpcMessage>>;
