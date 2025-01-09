import {astream, AsyncStream} from '../async-stream';
import {Crdt, CrdtDiff, CrdtEncoder} from '../crdt/crdt';
import {createIndex, Index, IndexKey} from '../kv/data-index';
import {Condition, Transaction, Uint8Transaction, withKeyEncoder, withPrefix, withValueEncoder} from '../kv/kv-store';
import {getNow, Timestamp} from '../timestamp';
import {pipe} from '../utils';
import {Uuid, UuidEncoder} from '../uuid';

export interface Doc<TId extends Uuid = Uuid> {
    id: TId;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type IndexSpec<T> =
    | {
          readonly unique?: boolean | undefined;
          readonly key: (x: T) => IndexKey;
      }
    | ((x: T) => IndexKey);

export type IndexMap<T> = Record<string, IndexSpec<T>>;

export type OnDocChange<T extends Doc> = (id: T['id'], diff: CrdtDiff<T>) => Promise<void>;

export interface DocStoreOptions<T extends Doc> {
    txn: Uint8Transaction;
    indexes?: IndexMap<T>;
    onChange: OnDocChange<T>;
}

export type Recipe<T> = (doc: T) => T | void;

export class DocRepo<T extends Doc> {
    private readonly indexes: Map<string, Index<T>>;
    private readonly primary: Transaction<Uuid, Crdt<T>>;
    private readonly onChange: OnDocChange<T>;

    constructor({txn, indexes, onChange}: DocStoreOptions<T>) {
        this.indexes = new Map(
            Object.entries(indexes ?? {}).map(([name, spec]) => {
                if (name.indexOf('/') !== -1) {
                    throw new Error('index name cannot contain /: ' + name);
                }

                return [
                    name,
                    createIndex({
                        txn: withPrefix(`i/${name}/`)(txn),
                        idSelector: x => x.id,
                        keySelector: typeof spec === 'function' ? spec : spec.key,
                        unique: typeof spec === 'function' ? false : (spec.unique ?? false),
                    }),
                ];
            })
        );
        this.primary = pipe(
            txn,
            withPrefix('d/'),
            withKeyEncoder(new UuidEncoder()),
            withValueEncoder(new CrdtEncoder())
        );
        this.onChange = onChange;
    }

    async getById(id: Uuid): Promise<T | undefined> {
        const doc = await this.primary.get(id);
        return doc?.snapshot();
    }

    get(indexName: string, key: IndexKey): AsyncStream<T> {
        const index = this._index(indexName);
        return this._mapToDocs(index.get(key));
    }

    async getUnique(indexName: string, key: IndexKey): Promise<T | undefined> {
        const index = this._index(indexName);
        const ids = await astream(index.get(key)).take(2).toArray();
        if (ids.length > 1) {
            throw new Error(`index ${indexName} contains multiple docs for the key: ${key}`);
        } else if (ids.length === 1) {
            return await this.getById(ids[0]);
        } else {
            return undefined;
        }
    }

    query(indexName: string, condition: Condition<IndexKey>): AsyncStream<T> {
        const index = this._index(indexName);

        return this._mapToDocs(index.query(condition));
    }

    async update(id: Uuid, recipe: Recipe<T>): Promise<T> {
        const doc = await this.primary.get(id);
        if (!doc) {
            throw new Error('doc not found: ' + id);
        }

        const prev = doc.snapshot();
        const diff = doc.update(draft => {
            const result = recipe(draft);
            if (result) {
                result.updatedAt = getNow();
            } else {
                draft.updatedAt = getNow();
            }

            return result;
        });
        if (!diff) {
            // no change were made to the document
            return prev;
        }
        const next = doc.snapshot();

        await Promise.all([this.primary.put(id, doc), this._sync(id, prev, next, diff)]);

        return next;
    }

    async create(doc: T): Promise<void> {
        const existing = await this.primary.get(doc.id);
        if (existing) {
            throw new Error(`doc ${doc.id} already exists`);
        }

        const now = getNow();
        const crdt = Crdt.from({...doc, createdAt: now, updatedAt: now});
        await Promise.all([this.primary.put(doc.id, crdt), this._sync(doc.id, undefined, doc, crdt.state())]);
    }

    private _index(indexName: string): Index<T> {
        const index = this.indexes.get(indexName);
        if (!index) {
            throw new Error('index not found: ' + indexName);
        }
        return index;
    }

    private async _sync(id: Uuid, prev: T | undefined, next: T | undefined, diff: CrdtDiff<T>): Promise<void> {
        await Promise.all([...[...this.indexes.values()].map(x => x.sync(prev, next)), this.onChange(id, diff)]);
    }

    private _mapToDocs(ids: AsyncIterable<Uuid>): AsyncStream<T> {
        return astream(ids)
            .map(id => this.primary.get(id))
            .assert(x => x !== undefined)
            .map(doc => doc.snapshot());
    }
}
