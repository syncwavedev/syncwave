import {Type} from '@sinclair/typebox';
import {context} from '../context.js';
import {joinBuffers, type Brand} from '../utils.js';
import {createUuid, Uuid} from '../uuid.js';

export interface JwtPayload {
    sub: string | undefined;
    uid: string | undefined;
    exp: number;
    iat: number;
}

export interface JwtProvider {
    verify(token: string): Promise<JwtPayload>;
    sign(payload: JwtPayload): Promise<string>;
}

export interface CryptoProvider {
    randomBytes(length: number): Promise<Uint8Array>;
    bcryptHash(password: string): Promise<string>;
    bcryptCompare(params: {hash: string; password: string}): Promise<boolean>;
}

export interface EmailMessage {
    recipient: string;
    subject: string;
    text: string;
    html: string;
}

export interface EmailProvider {
    send(message: EmailMessage): Promise<void>;
}

export class InstrumentedEmailProvider implements EmailProvider {
    constructor(private readonly emailProvider: EmailProvider) {}

    async send(message: EmailMessage): Promise<void> {
        return await context().runChild({span: 'email.send'}, async () => {
            return await this.emailProvider.send(message);
        });
    }
}

export interface ObjectMetadata {
    contentType: string;
}

export function ObjectMetadata() {
    return Type.Object({
        contentType: Type.String(),
    });
}

export type ObjectKey = Brand<Uuid, 'ObjectKey'>;

export function ObjectKey() {
    return Uuid<ObjectKey>();
}

export function createObjectKey() {
    return createUuid() as ObjectKey;
}

export interface ObjectEnvelope {
    readonly data: Uint8Array;
    readonly metadata: ObjectMetadata;
    readonly size: number;
}

export function ObjectEnvelope() {
    return Type.Object({
        data: Type.Uint8Array(),
        metadata: ObjectMetadata(),
    });
}

export interface ObjectStreamEnvelope {
    readonly data: ReadableStream<Uint8Array>;
    readonly metadata: ObjectMetadata;
    readonly size: number;
}

export interface ObjectStore {
    get(key: ObjectKey): Promise<ObjectEnvelope | undefined>;
    getStream(key: ObjectKey): Promise<ObjectStreamEnvelope | undefined>;
    put(
        key: ObjectKey,
        data: Uint8Array,
        metadata: ObjectMetadata
    ): Promise<void>;
    putStream(
        key: ObjectKey,
        data: ReadableStream<Uint8Array>,
        metadata: ObjectMetadata
    ): Promise<void>;
    delete(key: ObjectKey): Promise<void>;
}

export class MemObjectStore implements ObjectStore {
    private readonly store: Map<string, ObjectEnvelope>;

    constructor() {
        this.store = new Map();
    }

    async get(key: ObjectKey): Promise<ObjectEnvelope | undefined> {
        return this.store.get(key);
    }

    async getStream(key: ObjectKey): Promise<ObjectStreamEnvelope | undefined> {
        const envelope = this.store.get(key);
        if (!envelope) {
            return undefined;
        }

        return {
            metadata: envelope.metadata,
            size: envelope.data.byteLength,
            data: new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(envelope.data);
                    controller.close();
                },
            }),
        };
    }

    async put(
        key: ObjectKey,
        data: Uint8Array,
        options: ObjectMetadata
    ): Promise<void> {
        this.store.set(key, {data, metadata: options, size: data.byteLength});
    }

    async putStream(
        key: ObjectKey,
        data: ReadableStream<Uint8Array>,
        metadata: ObjectMetadata
    ): Promise<void> {
        const reader = data.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
            const {done, value} = await reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
        }

        const result = joinBuffers(chunks);
        await this.put(key, result, metadata);
    }

    async delete(key: ObjectKey): Promise<void> {
        this.store.delete(key);
    }
}
