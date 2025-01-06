import {type Brand} from '../../utils';
import {createUuid, type Uuid} from '../../uuid';
import {type CoordinatorRpc} from './coordinator';

export type MessageId = Brand<Uuid, 'message_id'>;

export function createMessageId(): MessageId {
    return createUuid() as MessageId;
}

export interface BaseMessage<TType extends string> {
    readonly type: TType;
    readonly id: MessageId;
}

export interface RpcRequestMessage extends BaseMessage<'req'> {
    readonly payload: {
        [K in keyof CoordinatorRpc]: {
            name: K;
            arg: Parameters<CoordinatorRpc[K]>[0];
        };
    }[keyof CoordinatorRpc];
}

export interface BaseRpcResponsePayload<TType extends string> {
    readonly type: TType;
}

export interface SuccessRpcResponsePayload extends BaseRpcResponsePayload<'success'> {
    readonly result: {
        [K in keyof CoordinatorRpc]: Awaited<ReturnType<CoordinatorRpc[K]>>;
    }[keyof CoordinatorRpc];
}

export interface ErrorRpcResponsePayload extends BaseRpcResponsePayload<'error'> {
    readonly message?: string;
}

export type RpcResponsePayload = SuccessRpcResponsePayload | ErrorRpcResponsePayload;

export interface RpcResponseMessage extends BaseMessage<'res'> {
    readonly reqId: MessageId;
    readonly payload: RpcResponsePayload;
}

export interface PingMessage extends BaseMessage<'ping'> {}

export interface PongMessage extends BaseMessage<'pong'> {
    readonly pingId: MessageId;
}

export type Message = RpcRequestMessage | RpcResponseMessage | PingMessage | PongMessage;
