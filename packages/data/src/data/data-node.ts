import {decodeString, encodeString} from '../codec.js';
import {decodeHex} from '../hex.js';
import {bufStartsWith} from '../utils.js';
import {decodeUuid, encodeUuid, Uuid} from '../uuid.js';
import {Doc, DocRepo} from './doc-repo.js';

export interface DataNodeVisitor<T> {
    repo(node: RepoDataNode<any>): T;
    doc(node: DocDataNode<any>): T;
    aggregate(node: AggregateDataNode<Record<string, DataNode>>): T;
}

export interface DataNodeChild {
    key: Uint8Array;
    node: DataNode;
}

export abstract class DataNode {
    abstract queryChildren(prefix: Uint8Array): AsyncIterable<DataNodeChild>;
    abstract child(part: Uint8Array): DataNode;
    abstract visit<T>(visitor: DataNodeVisitor<T>): T;
    abstract delete(): Promise<void>;
}

export class AggregateDataNode<
    T extends Record<string, DataNode>,
> extends DataNode {
    constructor(public readonly children: T) {
        super();
    }

    override async *queryChildren(
        prefix: Uint8Array
    ): AsyncIterable<DataNodeChild> {
        for (const [prop, node] of Object.entries(this.children)) {
            const key = encodeString(prop);
            if (bufStartsWith(key, prefix)) {
                yield {key, node};
            }
        }
    }

    override child(key: Uint8Array): DataNode {
        const result = this.children[decodeString(key)];
        if (!result) {
            `AggregateDataNode does not have any children with key = ${decodeHex(key)}`;
        }

        return result;
    }

    override visit<T>(visitor: DataNodeVisitor<T>): T {
        return visitor.aggregate(this);
    }

    override async delete(): Promise<void> {
        for await (const child of this.queryChildren(new Uint8Array())) {
            await child.node.delete();
        }
    }
}

export class RepoDataNode<T extends Doc> extends DataNode {
    constructor(private readonly repo: DocRepo<T>) {
        super();
    }

    override async *queryChildren(
        prefix: Uint8Array
    ): AsyncIterable<DataNodeChild> {
        yield* this.repo.getAll(prefix).map(doc => ({
            key: encodeUuid(doc.id),
            node: new DocDataNode(doc.id, this.repo),
        }));
    }

    override child(key: Uint8Array): DataNode {
        const uuid = decodeUuid(key);
        return new DocDataNode(uuid, this.repo);
    }

    override visit<TResult>(visitor: DataNodeVisitor<TResult>): TResult {
        return visitor.repo(this);
    }

    override async delete(): Promise<void> {
        await this.repo.unsafe_deleteAll();
    }
}

export class DocDataNode<T extends Doc> extends DataNode {
    constructor(
        public readonly docId: Uuid,
        private readonly repo: DocRepo<T>
    ) {
        super();
    }

    override async *queryChildren(): AsyncIterable<DataNodeChild> {
        // no children
    }

    override child(key: Uint8Array): DataNode {
        throw new Error(
            `DocDataNode does not have any children, part: ${decodeHex(key)}`
        );
    }

    override visit<T>(visitor: DataNodeVisitor<T>): T {
        return visitor.doc(this);
    }

    async snapshot(): Promise<T | undefined> {
        return await this.repo.getById(this.docId);
    }

    override async delete(): Promise<void> {
        await this.repo.unsafe_delete(this.docId);
    }
}
