import {AppError} from '../errors.js';
import {
    packString,
    stringifyTuple,
    tupleStartsWith,
    unpackString,
    type Tuple,
} from '../tuple.js';
import {DocRepo, type Doc} from './doc-repo.js';

export interface DataNodeVisitor<T> {
    repo(node: RepoDataNode<any>): T;
    doc(node: DocDataNode<any>): T;
    aggregate(node: AggregateDataNode<Record<string, DataNode>>): T;
}

export interface DataNodeChild {
    key: Tuple;
    node: DataNode;
}

export abstract class DataNode {
    abstract queryChildren(prefix: Tuple): AsyncIterable<DataNodeChild>;
    abstract child(part: Tuple): DataNode;
    abstract visit<T>(visitor: DataNodeVisitor<T>): T;
    abstract delete(): Promise<void>;
}

export class AggregateDataNode<
    T extends Record<string, DataNode>,
> extends DataNode {
    constructor(public readonly children: T) {
        super();
    }

    override async *queryChildren(prefix: Tuple): AsyncIterable<DataNodeChild> {
        for (const [prop, node] of Object.entries(this.children)) {
            const key = packString(prop);
            if (tupleStartsWith(key, prefix)) {
                yield {key, node};
            }
        }
    }

    override child(key: Tuple): DataNode {
        const result = this.children[unpackString(key)];
        if (!result) {
            `AggregateDataNode does not have any children with key = ${stringifyTuple(key)}`;
        }

        return result;
    }

    override visit<T>(visitor: DataNodeVisitor<T>): T {
        return visitor.aggregate(this);
    }

    override async delete(): Promise<void> {
        for await (const child of this.queryChildren([])) {
            await child.node.delete();
        }
    }
}

export class RepoDataNode<T extends Doc<any>> extends DataNode {
    constructor(private readonly repo: DocRepo<T>) {
        super();
    }

    override async *queryChildren(prefix: Tuple): AsyncIterable<DataNodeChild> {
        yield* this.repo.unsafe_getAll(prefix).map(doc => ({
            key: doc.pk,
            node: new DocDataNode(doc.pk, this.repo),
        }));
    }

    override child(key: Tuple): DataNode {
        return new DocDataNode(key, this.repo);
    }

    override visit<TResult>(visitor: DataNodeVisitor<TResult>): TResult {
        return visitor.repo(this);
    }

    override async delete(): Promise<void> {
        await this.repo.unsafe_deleteAll();
    }
}

export class DocDataNode<T extends Doc<Tuple>> extends DataNode {
    constructor(
        public readonly pk: Tuple,
        private readonly repo: DocRepo<T>
    ) {
        super();
    }

    override async *queryChildren(): AsyncIterable<DataNodeChild> {
        // no children
    }

    override child(key: Tuple): DataNode {
        throw new AppError(
            `DocDataNode does not have any children, part: ${stringifyTuple(key)}`
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
