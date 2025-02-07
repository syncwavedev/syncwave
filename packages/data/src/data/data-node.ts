import {decodeString, encodeString} from '../codec.js';
import {AppError} from '../errors.js';
import {decodeHex} from '../hex.js';
import {decodeIndexKey, encodeIndexKey, IndexKey} from '../kv/data-index.js';
import {bufStartsWith} from '../utils.js';
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

export class RepoDataNode<T extends Doc<any>> extends DataNode {
    constructor(private readonly repo: DocRepo<T>) {
        super();
    }

    override async *queryChildren(
        prefix: Uint8Array
    ): AsyncIterable<DataNodeChild> {
        yield* this.repo.unsafe_getAll(prefix).map(doc => ({
            key: encodeIndexKey(doc.pk),
            node: new DocDataNode(doc.pk, this.repo),
        }));
    }

    override child(key: Uint8Array): DataNode {
        const pk = decodeIndexKey(key);
        return new DocDataNode(pk, this.repo);
    }

    override visit<TResult>(visitor: DataNodeVisitor<TResult>): TResult {
        return visitor.repo(this);
    }

    override async delete(): Promise<void> {
        await this.repo.unsafe_deleteAll();
    }
}

export class DocDataNode<T extends Doc<IndexKey>> extends DataNode {
    constructor(
        public readonly pk: IndexKey,
        private readonly repo: DocRepo<T>
    ) {
        super();
    }

    override async *queryChildren(): AsyncIterable<DataNodeChild> {
        // no children
    }

    override child(key: Uint8Array): DataNode {
        throw new AppError(
            `DocDataNode does not have any children, part: ${decodeHex(key)}`
        );
    }

    override visit<T>(visitor: DataNodeVisitor<T>): T {
        return visitor.doc(this);
    }

    async snapshot(): Promise<T | undefined> {
        return await this.repo.getById(this.pk, true);
    }

    override async delete(): Promise<void> {
        await this.repo.unsafe_delete(this.pk);
    }
}
