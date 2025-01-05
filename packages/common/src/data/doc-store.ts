import {CrdtSerializer} from '../crdt-serializer';
import {Crdt, CrdtDiff} from '../crdt/crdt';
import {
    Condition,
    Transaction,
    Uint8Transaction,
    withKeySerializer,
    withPrefix,
    withValueSerializer,
} from '../kv/kv-store';
import {assert, mapStream, pipe} from '../utils';
import {Uuid, UuidSerializer} from '../uuid';
import {Index, createIndex} from './data-index';
import {IndexKey} from './key-serializer';
import {Timestamp} from './timestamp';

export interface Doc {
    id: Uuid;
}

export type IndexSpec<T> =
    | {
          readonly unique?: boolean | undefined;
          readonly key: (x: T) => IndexKey;
      }
    | ((x: T) => IndexKey);

export type IndexMap<T> = Record<string, IndexSpec<T>>;

export interface DocStoreOptions<T> {
    txn: Uint8Transaction;
    indexes?: IndexMap<T>;
}

export class DocStore<T extends Doc> {
    private readonly indexes: Map<string, Index<T>>;
    private readonly primary: Transaction<Uuid, Crdt<T>>;

    constructor({txn, indexes}: DocStoreOptions<T>) {
        this.indexes = new Map(
            Object.entries(indexes ?? {}).map(([name, spec]) => [
                name,
                createIndex({
                    txn: withPrefix(`i/${name}/`)(txn),
                    idSelector: x => x.id,
                    keySelector: typeof spec === 'function' ? spec : spec.key,
                    unique: typeof spec === 'function' ? false : (spec.unique ?? false),
                }),
            ])
        );
        this.primary = pipe(
            txn,
            withPrefix('d/'),
            withKeySerializer(new UuidSerializer()),
            withValueSerializer(new CrdtSerializer())
        );
    }

    async *query(indexName: string, condition: Condition<IndexKey>): AsyncIterable<T> {
        const index = this.indexes.get(indexName);
        if (!index) {
            throw new Error('index not found: ' + indexName);
        }

        const resultIds = index.query(condition);
        const docs = mapStream(resultIds, ids => Promise.all(ids.map(id => this.primary.get(id))), 64);
        for await (const doc of docs) {
            assert(doc !== undefined);
            yield doc.snapshot();
        }
    }

    async update(id: Uuid, diff: CrdtDiff<T>): Promise<T> {
        const doc = await this.primary.get(id);
        if (!doc) {
            throw new Error('doc not found: ' + id);
        }

        const prev = doc.snapshot();
        doc.apply(diff);
        const next = doc.snapshot();

        await Promise.all([this.primary.put(id, doc), this._sync(prev, next)]);

        return next;
    }

    async create(doc: T): Promise<void> {
        const existing = await this.primary.get(doc.id);
        if (existing) {
            throw new Error(`doc ${doc.id} already exists`);
        }

        await Promise.all([this.primary.put(doc.id, Crdt.from(doc)), this._sync(undefined, doc)]);
    }

    async _sync(prev: T | undefined, next: T | undefined): Promise<void> {
        await Promise.all([...this.indexes.values()].map(x => x.sync(prev, next)));
    }
}

interface Task {
    readonly id: Uuid;
    readonly name: string;
    readonly boardId: Uuid;
    readonly authorId: Uuid;
    readonly createdAt: Timestamp;
    readonly modifiedAt: Timestamp;
}

const txn = 1 as any;
const store = new DocStore({
    txn,
    indexes: {
        board: (task: Task) => [task.boardId],
    },
});
