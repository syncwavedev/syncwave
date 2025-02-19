import {access, mkdir, readFile, unlink, writeFile} from 'fs/promises';
import path from 'path';
import type {ObjectKey, ObjectMetadata, ObjectStore} from 'syncwave-data';

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

    // A helper to determine where the metadata is stored.
    private getMetadataPath(key: ObjectKey): string {
        return this.getFilePath(key) + '.metadata.json';
    }

    async get(
        key: ObjectKey
    ): Promise<{data: Uint8Array; metadata: ObjectMetadata} | undefined> {
        const filePath = this.getFilePath(key);
        try {
            await access(filePath);
        } catch {
            return undefined;
        }
        const data = await readFile(filePath);

        const metadataContent = await readFile(this.getMetadataPath(key), {
            encoding: 'utf8',
        });
        const metadata = JSON.parse(metadataContent) as ObjectMetadata;

        return {data, metadata};
    }

    async put(
        key: ObjectKey,
        data: Uint8Array,
        options: ObjectMetadata
    ): Promise<void> {
        await writeFile(this.getFilePath(key), data);
        await writeFile(this.getMetadataPath(key), JSON.stringify(options));
    }

    async delete(key: ObjectKey): Promise<void> {
        await unlink(this.getFilePath(key));
        await unlink(this.getMetadataPath(key));
    }
}

interface FileObjectStoreOptions {
    basePath: string;
}
