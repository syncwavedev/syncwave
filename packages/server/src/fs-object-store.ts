import {access, mkdir, readFile, unlink, writeFile} from 'fs/promises';
import path from 'path';
import {
    decodeMsgpack,
    encodeMsgpack,
    type ObjectEnvelope,
    type ObjectKey,
    type ObjectMetadata,
    type ObjectStore,
} from 'syncwave-data';

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
        const encodedEnvelope = await readFile(filePath);

        return decodeMsgpack(encodedEnvelope) as ObjectEnvelope;
    }

    async put(
        key: ObjectKey,
        data: Uint8Array,
        metadata: ObjectMetadata
    ): Promise<void> {
        const envelope: ObjectEnvelope = {
            data,
            metadata,
        };
        await writeFile(this.getFilePath(key), encodeMsgpack(data));
    }

    async delete(key: ObjectKey): Promise<void> {
        await unlink(this.getFilePath(key));
    }
}

interface FileObjectStoreOptions {
    basePath: string;
}
