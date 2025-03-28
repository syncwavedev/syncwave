import {
    DeleteObjectCommand,
    GetObjectCommand,
    NoSuchKey,
    PutObjectCommand,
    S3Client,
    type S3ClientConfig,
} from '@aws-sdk/client-s3';
import type {ObjectKey, ObjectMetadata, ObjectStore} from 'syncwave';
import {assert} from 'syncwave';

export interface S3ObjectStoreOptions {
    bucketName: string;
    region?: string;
    endpoint?: string;
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    forcePathStyle?: boolean;
}

export class S3ObjectStore implements ObjectStore {
    private bucketName: string;
    private s3Client: S3Client;

    constructor(options: S3ObjectStoreOptions) {
        this.bucketName = options.bucketName;

        const clientConfig: S3ClientConfig = {
            region: options.region,
            endpoint: options.endpoint,
            credentials: options.credentials,
            forcePathStyle: options.forcePathStyle ?? true,
        };
        this.s3Client = new S3Client(clientConfig);
    }

    async get(
        key: ObjectKey
    ): Promise<{data: Uint8Array; metadata: ObjectMetadata} | undefined> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            const response = await this.s3Client.send(command);

            assert(
                response.Body !== undefined,
                'S3: Response body is undefined'
            );

            const data = await response.Body.transformToByteArray();

            const metadata: ObjectMetadata = {
                contentType: response.ContentType ?? 'application/octet-stream',
            };

            return {data, metadata};
        } catch (error: unknown) {
            if (error instanceof NoSuchKey) {
                return undefined;
            }

            throw error;
        }
    }

    async put(
        key: ObjectKey,
        data: Uint8Array,
        options: ObjectMetadata
    ): Promise<void> {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: data,
            ContentType: options.contentType,
        });
        await this.s3Client.send(command);
    }

    async delete(key: ObjectKey): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });
        await this.s3Client.send(command);
    }
}
