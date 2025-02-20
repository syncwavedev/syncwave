import {context} from '../context.js';
import type {Brand} from '../utils.js';
import {createUuid, Uuid, zUuid} from '../uuid.js';

export interface JwtPayload {
    sub: string | undefined;
    uid: string | undefined;
    exp: number;
    iat: number;
}

export interface JwtService {
    verify(token: string, secret: string): Promise<JwtPayload>;
    sign(payload: JwtPayload, secret: string): Promise<string>;
}

export interface CryptoService {
    sha256(text: string): string;
    randomBytes(length: number): Promise<Uint8Array>;
}

export interface EmailMessage {
    recipient: string;
    subject: string;
    text: string;
    html: string;
}

export interface EmailService {
    send(message: EmailMessage): Promise<void>;
}

export class InstrumentedEmailService implements EmailService {
    constructor(private readonly emailService: EmailService) {}

    async send(message: EmailMessage): Promise<void> {
        return await context().runChild({span: 'email.send'}, async () => {
            return await this.emailService.send(message);
        });
    }
}

export interface ObjectMetadata {
    contentType: string;
}

export type ObjectKey = Brand<Uuid, 'ObjectKey'>;

export function zObjectKey() {
    return zUuid<ObjectKey>();
}

export function createObjectKey() {
    return createUuid() as ObjectKey;
}

export interface ObjectEnvelope {
    readonly data: Uint8Array;
    readonly metadata: ObjectMetadata;
}

export interface ObjectStore {
    get(key: ObjectKey): Promise<ObjectEnvelope | undefined>;
    put(
        key: ObjectKey,
        data: Uint8Array,
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

    async put(
        key: ObjectKey,
        data: Uint8Array,
        options: ObjectMetadata
    ): Promise<void> {
        this.store.set(key, {data, metadata: options});
    }

    async delete(key: ObjectKey): Promise<void> {
        this.store.delete(key);
    }
}
