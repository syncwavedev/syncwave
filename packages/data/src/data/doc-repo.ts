import {z, ZodType} from 'zod';
import {astream, AsyncStream} from '../async-stream.js';
import {Crdt, CrdtCodec, CrdtDiff} from '../crdt/crdt.js';
import {createIndex, Index, IndexKey} from '../kv/data-index.js';
import {
    Condition,
    queryStartsWith,
    Transaction,
    Uint8Transaction,
    withKeyCodec,
    withPrefix,
    withValueCodec,
} from '../kv/kv-store.js';
import {getNow, Timestamp, zTimestamp} from '../timestamp.js';
import {pipe, whenAll} from '../utils.js';
import {Uuid, UuidCodec, zUuid} from '../uuid.js';
import {UpdateChecker} from './update-checker.js';

export interface Doc<TId extends Uuid = Uuid> {
    id: TId;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export function zDoc<TId extends Uuid>() {
    return z.object({
        id: zUuid<TId>(),
        createdAt: zTimestamp(),
        updatedAt: zTimestamp(),
    });
}

export type IndexSpec<T> =
    | {
          readonly unique?: boolean | undefined;
          readonly key: (x: T) => IndexKey;
          readonly include?: (x: T) => boolean;
      }
    | ((x: T) => IndexKey);

export type IndexMap<T> = Record<string, IndexSpec<T>>;

export type OnDocChange<T extends Doc> = (
    id: T['id'],
    diff: CrdtDiff<T>
) => Promise<void>;

export interface DocStoreOptions<T extends Doc> {
    tx: Uint8Transaction;
    indexes: IndexMap<T>;
    schema: ZodType<T>;
    onChange: OnDocChange<T>;
}

export type Recipe<T> = (doc: T) => T | void;

export interface SyncTarget<T> {
    apply(id: Uuid, diff: CrdtDiff<T>): Promise<void>;
}

export class DocRepo<T extends Doc> implements SyncTarget<T> {
    private readonly indexes: Map<string, Index<T>>;
    private readonly primary: Transaction<Uuid, Crdt<T>>;
    private readonly primaryKeyRaw: Transaction<Uint8Array, Crdt<T>>;
    private readonly onChange: OnDocChange<T>;
    private readonly schema: ZodType<T>;

    constructor({tx, indexes, onChange, schema}: DocStoreOptions<T>) {
        this.indexes = new Map(
            Object.entries(indexes).map(([indexName, spec]) => {
                if (indexName.indexOf('/') !== -1) {
                    throw new Error(
                        'index name cannot contain /: ' + indexName
                    );
                }

                return [
                    indexName,
                    createIndex({
                        tx: withPrefix(`i/${indexName}/`)(tx),
                        idSelector: x => x.id,
                        keySelector:
                            typeof spec === 'function' ? spec : spec.key,
                        unique:
                            typeof spec === 'function'
                                ? false
                                : (spec.unique ?? false),
                        indexName,
                    }),
                ];
            })
        );
        this.primaryKeyRaw = pipe(
            tx,
            withPrefix('d/'),
            withValueCodec(new CrdtCodec())
        );
        this.primary = withKeyCodec(new UuidCodec())(this.primaryKeyRaw);
        this.onChange = onChange;
        this.schema = schema;
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
            throw new Error(
                `index ${indexName} contains multiple docs for the key: ${key}`
            );
        } else if (ids.length === 1) {
            return await this.getById(ids[0]);
        } else {
            return undefined;
        }
    }

    getAll(prefix?: Uint8Array): AsyncStream<T> {
        return astream(
            queryStartsWith(this.primaryKeyRaw, prefix ?? new Uint8Array())
        ).mapParallel(x => x.value.snapshot());
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
            const result = recipe(draft) ?? draft;

            result.updatedAt = getNow();

            return result;
        });
        if (!diff) {
            // no change were made to the document
            return prev;
        }
        const next = doc.snapshot();
        this.ensureValid(next);

        await whenAll([
            this.primary.put(id, doc),
            this._sync(id, prev, next, diff),
        ]);

        return next;
    }

    // todo: add tests
    async apply(
        id: Uuid,
        diff: CrdtDiff<T>,
        updateChecker?: UpdateChecker<T>
    ): Promise<void> {
        let doc: Crdt<T> | undefined = await this.primary.get(id);
        let prev: T | undefined;
        let next: T;
        if (doc) {
            prev = doc.snapshot();
            doc.apply(diff);
            next = doc.snapshot();
        } else {
            prev = undefined;
            doc = Crdt.load(diff);
            next = doc.snapshot();
        }

        if (next.id !== id) {
            throw new Error('invalid diff: diff updates id ' + id);
        }

        if (prev && updateChecker) {
            updateChecker(prev, next);
        }

        this.ensureValid(next);
    }

    async create(doc: T): Promise<T> {
        const existing = await this.primary.get(doc.id);
        if (existing) {
            throw new Error(`doc ${doc.id} already exists`);
        }

        const now = getNow();
        const crdt = Crdt.from({...doc, createdAt: now, updatedAt: now});
        await whenAll([
            this.primary.put(doc.id, crdt),
            this._sync(doc.id, undefined, doc, crdt.state()),
        ]);

        return crdt.snapshot();
    }

    private _index(indexName: string): Index<T> {
        const index = this.indexes.get(indexName);
        if (!index) {
            throw new Error('index not found: ' + indexName);
        }
        return index;
    }

    private async _sync(
        id: Uuid,
        prev: T | undefined,
        next: T | undefined,
        diff: CrdtDiff<T>
    ): Promise<void> {
        await whenAll([
            ...[...this.indexes.values()].map(x => x.sync(prev, next)),
            this.onChange(id, diff),
        ]);
    }

    private _mapToDocs(ids: AsyncIterable<Uuid>): AsyncStream<T> {
        return astream(ids)
            .mapParallel(id => this.primary.get(id))
            .assert(x => x !== undefined)
            .mapParallel(doc => doc.snapshot());
    }

    private ensureValid(value: T) {
        this.schema.parse(value);
    }
}
