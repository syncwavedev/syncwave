import {createTraceId, TraceId} from '../../context.js';
import {ErrorCode, ErrorType} from '../../errors.js';
import {Brand} from '../../utils.js';

export type MessageId = Brand<string, 'message_id'>;

export function createMessageId(): MessageId {
    return createTraceId() as MessageId;
}

export interface MessageHeaders {
    readonly auth?: string;
    readonly traceId?: TraceId;
}

export interface BaseMessage<TType extends string> {
    readonly type: TType;
    readonly id: MessageId;
    readonly headers: MessageHeaders;
}

export interface RequestMessage extends BaseMessage<'request'> {
    readonly payload: {
        name: string;
        arg: any;
    };
}

export interface CancelMessage extends BaseMessage<'cancel'> {
    readonly requestId: MessageId;
}

export interface BaseResponsePayload<TType extends string> {
    readonly type: TType;
}

export interface SuccessResponsePayload extends BaseResponsePayload<'success'> {
    readonly result: unknown;
}

export interface ErrorResponsePayload extends BaseResponsePayload<'error'> {
    readonly message: string;
    readonly code: ErrorCode;
    readonly errorType: ErrorType;
}

export type ResponsePayload = SuccessResponsePayload | ErrorResponsePayload;

export interface ResponseMessage extends BaseMessage<'response'> {
    readonly requestId: MessageId;
    readonly payload: ResponsePayload;
}

export type Message = RequestMessage | CancelMessage | ResponseMessage;
