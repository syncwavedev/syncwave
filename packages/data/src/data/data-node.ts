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
}

export class AggregateDataNode<
    T extends Record<string, DataNode>,
> extends DataNode {
    constructor(public readonly children: T) {
        super();
    }

    async *queryChildren(prefix: Uint8Array): AsyncIterable<DataNodeChild> {
        for (const [prop, node] of Object.entries(this.children)) {
            const key = encodeString(prop);
            if (bufStartsWith(key, prefix)) {
                yield {key, node};
            }
        }
    }

    child(key: Uint8Array): DataNode {
        const result = this.children[decodeString(key)];
        if (!result) {
            `AggregateDataNode does not have any children with key = ${decodeHex(key)}`;
        }

        return result;
    }

    visit<T>(visitor: DataNodeVisitor<T>): T {
        return visitor.aggregate(this);
    }
}

export class RepoDataNode<T extends Doc> extends DataNode {
    constructor(private readonly repo: DocRepo<T>) {
        super();
    }

    async *queryChildren(prefix: Uint8Array): AsyncIterable<DataNodeChild> {
        yield* this.repo.getAll(prefix).map(doc => ({
            key: encodeUuid(doc.id),
            node: new DocDataNode(doc.id, this.repo),
        }));
    }

    child(key: Uint8Array): DataNode {
        const uuid = decodeUuid(key);
        return new DocDataNode(uuid, this.repo);
    }

    visit<TResult>(visitor: DataNodeVisitor<TResult>): TResult {
        return visitor.repo(this);
    }
}

export class DocDataNode<T extends Doc> extends DataNode {
    constructor(
        public readonly docId: Uuid,
        private readonly repo: DocRepo<T>
    ) {
        super();
    }

    async *queryChildren(): AsyncIterable<DataNodeChild> {
        // no children
    }

    child(key: Uint8Array): DataNode {
        throw new Error(
            `DocDataNode does not have any children, part: ${decodeHex(key)}`
        );
    }

    visit<T>(visitor: DataNodeVisitor<T>): T {
        return visitor.doc(this);
    }

    async snapshot(): Promise<T | undefined> {
        return await this.repo.getById(this.docId);
    }
}
