import {type Brand} from '../../utils';
import {createUuid, type Uuid} from '../../uuid';
import {type CoordinatorRpc} from './coordinator';

export type MessageId = Brand<Uuid, 'message_id'>;

export function createMessageId(): MessageId {
    return createUuid() as MessageId;
}

export interface MessageHeaders {
    readonly auth?: string;
}

export interface BaseMessage<TType extends string> {
    readonly type: TType;
    readonly id: MessageId;
    readonly headers?: MessageHeaders;
}

export interface RequestMessage extends BaseMessage<'request'> {
    readonly payload: {
        [K in keyof CoordinatorRpc]: {
            name: K;
            arg: Parameters<CoordinatorRpc[K]>[0];
        };
    }[keyof CoordinatorRpc];
}

export interface BaseResponsePayload<TType extends string> {
    readonly type: TType;
}

export interface SuccessResponsePayload extends BaseResponsePayload<'success'> {
    readonly result: {
        [K in keyof CoordinatorRpc]: Awaited<ReturnType<CoordinatorRpc[K]>>;
    }[keyof CoordinatorRpc];
}

export interface ErrorResponsePayload extends BaseResponsePayload<'error'> {
    readonly message?: string;
}

export type ResponsePayload = SuccessResponsePayload | ErrorResponsePayload;

export interface RpcResponseMessage extends BaseMessage<'response'> {
    readonly requestId: MessageId;
    readonly payload: ResponsePayload;
}

export interface PingMessage extends BaseMessage<'ping'> {}

export interface PongMessage extends BaseMessage<'pong'> {
    readonly pingId: MessageId;
}

export type Message = RequestMessage | RpcResponseMessage | PingMessage | PongMessage;
