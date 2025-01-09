import {type Brand} from '../../utils';
import {createUuid, type Uuid} from '../../uuid';
import {type CoordinatorApi} from '../coordinator';

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
        name: string;
        arg: any;
    };
}

export interface BaseResponsePayload<TType extends string> {
    readonly type: TType;
}

export interface SuccessResponsePayload extends BaseResponsePayload<'success'> {
    readonly result: {
        [K in keyof CoordinatorApi]: Awaited<ReturnType<CoordinatorApi[K]>>;
    }[keyof CoordinatorApi];
}

export interface ErrorResponsePayload extends BaseResponsePayload<'error'> {
    readonly message?: string;
}

export type ResponsePayload = SuccessResponsePayload | ErrorResponsePayload;

export interface RpcResponseMessage extends BaseMessage<'response'> {
    readonly requestId: MessageId;
    readonly payload: ResponsePayload;
}

export type Message = RequestMessage | RpcResponseMessage;
