import {z} from 'zod';
import {createTraceId} from '../context.js';
import type {Brand} from '../utils.js';
import {Uuid, zUuid} from '../uuid.js';

export function zMessageId() {
    return zUuid<MessageId>();
}

export type MessageId = Brand<Uuid, 'message_id'>;

export function createMessageId(): MessageId {
    return createTraceId() as MessageId;
}

export function zMessageHeaders() {
    return z.object({
        auth: z.string().optional(),
        traceparent: z.string(),
        tracestate: z.string(),
    });
}

export type MessageHeaders = z.infer<ReturnType<typeof zMessageHeaders>>;

export function zBaseMessage<TType extends string>(type: TType) {
    return z.object({
        type: z.literal(type),
        id: zMessageId(),
        headers: zMessageHeaders(),
    });
}

export function zRequestMessage() {
    return zBaseMessage('request').extend({
        payload: z.object({
            name: z.string(),
            arg: z.any(),
        }),
    });
}

export type RequestMessage = z.infer<ReturnType<typeof zRequestMessage>>;

export function zCancelMessage() {
    return zBaseMessage('cancel').extend({
        requestId: zMessageId(),
        reason: z.string(),
    });
}

export type CancelMessage = z.infer<ReturnType<typeof zCancelMessage>>;

export function zBaseResponsePayload<TType extends string>(type: TType) {
    return z.object({
        type: z.literal(type),
    });
}

export type BaseResponsePayload<TType extends string> = z.infer<
    ReturnType<typeof zBaseResponsePayload<TType>>
>;

export function zSuccessResponsePayload() {
    return zBaseResponsePayload('success').extend({
        result: z.unknown(),
    });
}

export type SuccessResponsePayload = z.infer<
    ReturnType<typeof zSuccessResponsePayload>
>;

export function zErrorResponsePayload() {
    return zBaseResponsePayload('error').extend({
        message: z.string(),
        code: z.string(),
    });
}

export type ErrorResponsePayload = z.infer<
    ReturnType<typeof zErrorResponsePayload>
>;

export function zResponsePayload() {
    return z.discriminatedUnion('type', [
        zSuccessResponsePayload(),
        zErrorResponsePayload(),
    ]);
}

export type ResponsePayload = z.infer<ReturnType<typeof zResponsePayload>>;

export function zResponseMessage() {
    return zBaseMessage('response').extend({
        requestId: zMessageId(),
        payload: zResponsePayload(),
    });
}

export type ResponseMessage = z.infer<ReturnType<typeof zResponseMessage>>;

export function zMessage() {
    return z.discriminatedUnion('type', [
        zRequestMessage(),
        zCancelMessage(),
        zResponseMessage(),
    ]);
}

export type Message = z.infer<ReturnType<typeof zMessage>>;
