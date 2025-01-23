import {Uint8KVStore} from '../kv/kv-store.js';
import {Doc, DocRepo} from './doc-repo.js';

export interface DataNodeVisitor<T> {
    repo(node: RepoDataNode<any>): T;
}

export abstract class DataNode {
    constructor(
        public readonly name: string,
        private readonly store: Uint8KVStore
    ) {}

    abstract children(after: Uint8Array): AsyncIterable<DataNode>;
    abstract visit<T>(visitor: DataNodeVisitor<T>): T;

    async clear(): Promise<void> {
        await this.store.transaction(async tx => {
            for await (const {key} of tx.query({gte: new Uint8Array()})) {
                await tx.delete(key);
            }
        });
    }
}

export class RepoDataNode<T extends Doc> extends DataNode {
    constructor(
        name: string,
        private readonly repo: DocRepo<T>,
        store: Uint8KVStore
    ) {
        super(name, store);
    }

    children(after: Uint8Array): AsyncIterable<DataNode> {
        throw new Error('Method not implemented.');
    }

    visit<TResult>(visitor: DataNodeVisitor<TResult>): TResult {
        return visitor.repo(this);
    }
}
