import {access, mkdir, readFile, unlink, writeFile} from 'fs/promises';
import path from 'path';
import {
    decodeMsgpack,
    encodeMsgpack,
    joinBuffers,
    type ObjectEnvelope,
    type ObjectKey,
    type ObjectMetadata,
    type ObjectStore,
    type ObjectStreamEnvelope,
} from 'syncwave';

export class FsObjectStore implements ObjectStore {
    private basePath: string;

    static async create(
        options: FileObjectStoreOptions
    ): Promise<FsObjectStore> {
        await mkdir(options.basePath, {recursive: true});
        return new FsObjectStore(options);
    }

    private constructor(options: FileObjectStoreOptions) {
        this.basePath = options.basePath;
    }

    private getFilePath(key: ObjectKey): string {
        return path.join(this.basePath, key + '.object');
    }

    async get(key: ObjectKey): Promise<ObjectEnvelope | undefined> {
        const filePath = this.getFilePath(key);
        try {
            await access(filePath);
        } catch {
            return undefined;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const encodedEnvelope = await readFile(filePath);

        const res = decodeMsgpack(encodedEnvelope) as ObjectEnvelope;

        return res;
    }

    async getStream(key: ObjectKey): Promise<ObjectStreamEnvelope | undefined> {
        const envelope = await this.get(key);
        if (!envelope) {
            return undefined;
        }
        return {
            metadata: envelope.metadata,
            data: new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(envelope.data);
                    controller.close();
                },
            }),
            size: envelope.data.byteLength,
        };
    }

    async put(
        key: ObjectKey,
        data: Uint8Array,
        metadata: ObjectMetadata
    ): Promise<void> {
        const envelope: ObjectEnvelope = {
            data,
            metadata,
            size: data.byteLength,
        };
        await new Promise(resolve => setTimeout(resolve, 1000));
        await writeFile(this.getFilePath(key), encodeMsgpack(envelope));
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

        await this.put(key, joinBuffers(chunks), metadata);
    }

    async delete(key: ObjectKey): Promise<void> {
        await unlink(this.getFilePath(key));
    }
}

interface FileObjectStoreOptions {
    basePath: string;
}
