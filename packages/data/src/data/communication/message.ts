import {Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';

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
    readonly result: unknown;
}

export interface ItemResponsePayload extends BaseResponsePayload<'item'> {
    readonly item: unknown;
}

export interface EndResponsePayload extends BaseResponsePayload<'end'> {}

export interface ErrorResponsePayload extends BaseResponsePayload<'error'> {
    readonly message?: string;
}

export type ResponsePayload = SuccessResponsePayload | ErrorResponsePayload;
// | ItemResponsePayload
// | EndResponsePayload

export interface RpcResponseMessage extends BaseMessage<'response'> {
    readonly requestId: MessageId;
    readonly payload: ResponsePayload;
}

export type Message = RequestMessage | RpcResponseMessage;
