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

        await new Promise(resolve => setTimeout(resolve, 1000));

        const encodedEnvelope = await readFile(filePath);

        const res = decodeMsgpack(encodedEnvelope) as ObjectEnvelope;

        return res;
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        await writeFile(this.getFilePath(key), encodeMsgpack(envelope));
    }

    async delete(key: ObjectKey): Promise<void> {
        await unlink(this.getFilePath(key));
    }
}

interface FileObjectStoreOptions {
    basePath: string;
}
