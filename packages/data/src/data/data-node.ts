import {decodeString, encodeString} from '../codec.js';
import {Cx} from '../context.js';
import {AppError} from '../errors.js';
import {decodeHex} from '../hex.js';
import {bufStartsWith} from '../utils.js';
import {decodeUuid, encodeUuid, Uuid} from '../uuid.js';
import {Doc, DocRepo} from './doc-repo.js';

export interface DataNodeVisitor<T> {
    repo(cx: Cx, node: RepoDataNode<any>): T;
    doc(cx: Cx, node: DocDataNode<any>): T;
    aggregate(cx: Cx, node: AggregateDataNode<Record<string, DataNode>>): T;
}

export interface DataNodeChild {
    key: Uint8Array;
    node: DataNode;
}

export abstract class DataNode {
    abstract queryChildren(
        cx: Cx,
        prefix: Uint8Array
    ): AsyncIterable<DataNodeChild>;
    abstract child(cx: Cx, part: Uint8Array): DataNode;
    abstract visit<T>(cx: Cx, visitor: DataNodeVisitor<T>): T;
}

export class AggregateDataNode<
    T extends Record<string, DataNode>,
> extends DataNode {
    constructor(public readonly children: T) {
        super();
    }

    async *queryChildren(
        cx: Cx,
        prefix: Uint8Array
    ): AsyncIterable<DataNodeChild> {
        for (const [prop, node] of Object.entries(this.children)) {
            const key = encodeString(cx, prop);
            if (bufStartsWith(key, prefix)) {
                yield {key, node};
            }
        }
    }

    child(cx: Cx, key: Uint8Array): DataNode {
        const result = this.children[decodeString(cx, key)];
        if (!result) {
            `AggregateDataNode does not have any children with key = ${decodeHex(key)}`;
        }

        return result;
    }

    visit<T>(cx: Cx, visitor: DataNodeVisitor<T>): T {
        return visitor.aggregate(cx, this);
    }
}

export class RepoDataNode<T extends Doc> extends DataNode {
    constructor(private readonly repo: DocRepo<T>) {
        super();
    }

    async *queryChildren(
        cx: Cx,
        prefix: Uint8Array
    ): AsyncIterable<DataNodeChild> {
        yield* this.repo.getAll(cx, prefix).map((cx, doc) => ({
            key: encodeUuid(cx, doc.id),
            node: new DocDataNode(doc.id, this.repo),
        }));
    }

    child(cx: Cx, key: Uint8Array): DataNode {
        const uuid = decodeUuid(cx, key);
        return new DocDataNode(uuid, this.repo);
    }

    visit<TResult>(cx: Cx, visitor: DataNodeVisitor<TResult>): TResult {
        return visitor.repo(cx, this);
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

    child(cx: Cx, key: Uint8Array): DataNode {
        throw new AppError(
            cx,
            `DocDataNode does not have any children, part: ${decodeHex(key)}`
        );
    }

    visit<T>(cx: Cx, visitor: DataNodeVisitor<T>): T {
        return visitor.doc(cx, this);
    }

    async snapshot(cx: Cx): Promise<T | undefined> {
        return await this.repo.getById(cx, this.docId);
    }
}
