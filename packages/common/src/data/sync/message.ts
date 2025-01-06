import {type Brand} from '../../utils';
import {type Uuid} from '../../uuid';
import {type LeaderRpc} from './leader';

export type MessageId = Brand<Uuid, 'message_id'>;

export interface BaseMessage<TType extends string> {
    readonly type: TType;
    readonly id: MessageId;
}

export interface RpcRequestMessage extends BaseMessage<'rpc_request'> {
    readonly payload: {
        [K in keyof LeaderRpc]: {
            name: K;
            arg: Parameters<LeaderRpc[K]>[0];
        };
    }[keyof LeaderRpc];
}

export interface BaseRpcResponsePayload<TType extends string> {
    readonly type: TType;
}

export interface SuccessRpcResponsePayload extends BaseRpcResponsePayload<'success'> {
    readonly result: {
        [K in keyof LeaderRpc]: Awaited<ReturnType<LeaderRpc[K]>>;
    }[keyof LeaderRpc];
}

export interface ErrorRpcResponsePayload extends BaseRpcResponsePayload<'error'> {
    readonly message?: string;
}

export type RpcResponsePayload = SuccessRpcResponsePayload | ErrorRpcResponsePayload;

export interface RpcResponseMessage extends BaseMessage<'rpc_response'> {
    readonly responseFor: MessageId;
    readonly payload: RpcResponsePayload;
}

export interface PingMessage extends BaseMessage<'ping'> {}

export interface PongMessage extends BaseMessage<'pong'> {
    readonly replyFor: MessageId;
}

export type Message = RpcRequestMessage | RpcResponseMessage | PingMessage | PongMessage;
