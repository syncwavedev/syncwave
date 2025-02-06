import {z, ZodType} from 'zod';
import {Crdt, CrdtCodec, CrdtDiff} from '../crdt/crdt.js';
import {
    compareIndexKey,
    createIndex,
    Index,
    IndexKey,
    IndexKeyCodec,
    indexKeyToString,
} from '../kv/data-index.js';
import {
    Condition,
    queryStartsWith,
    Transaction,
    Uint8Transaction,
    withKeyCodec,
    withPrefix,
    withValueCodec,
} from '../kv/kv-store.js';
import {Stream, toStream} from '../stream.js';
import {getNow, Timestamp, zTimestamp} from '../timestamp.js';
import {pipe, whenAll} from '../utils.js';
import {UpdateChecker} from './update-checker.js';

export class ConstraintError extends Error {
    constructor(public readonly constraintName: string) {
        super('constraint failed: ' + constraintName);
        this.name = 'ConstraintError';
    }
}

export interface Doc<TKey extends IndexKey> {
    readonly pk: TKey;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export function zDoc<T extends IndexKey>(pk: ZodType<T>) {
    return z.object({
        pk: pk,
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

export type OnDocChange<T extends Doc<IndexKey>> = (
    pk: T['pk'],
    diff: CrdtDiff<T>
) => Promise<void>;

export interface Constraint<T extends Doc<IndexKey>> {
    readonly name: string;
    readonly verify: (doc: T) => Promise<boolean>;
}

export interface DocStoreOptions<T extends Doc<IndexKey>> {
    tx: Uint8Transaction;
    indexes: IndexMap<T>;
    schema: ZodType<T>;
    onChange: OnDocChange<T>;
    constraints: readonly Constraint<T>[];
}

export type Recipe<T> = (doc: T) => T | void;

export class DocRepo<T extends Doc<IndexKey>> {
    private readonly indexes: Map<string, Index<T>>;
    private readonly primary: Transaction<IndexKey, Crdt<T>>;
    private readonly primaryKeyRaw: Transaction<Uint8Array, Crdt<T>>;
    private readonly onChange: OnDocChange<T>;
    private readonly schema: ZodType<T>;
    private readonly constraints: readonly Constraint<T>[];

    constructor({
        tx,
        indexes,
        onChange,
        schema,
        constraints,
    }: DocStoreOptions<T>) {
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
                        idSelector: x => x.pk,
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
        this.primary = withKeyCodec(new IndexKeyCodec())(this.primaryKeyRaw);
        this.onChange = onChange;
        this.schema = schema;
        this.constraints = constraints;
    }

    async getById(id: IndexKey): Promise<T | undefined> {
        const doc = await this.primary.get(id);
        return doc?.snapshot();
    }

    get(indexName: string, key: IndexKey): Stream<T> {
        const index = this._index(indexName);
        return this._mapToDocs(index.get(key));
    }

    async getUnique(indexName: string, key: IndexKey): Promise<T | undefined> {
        const index = this._index(indexName);
        const ids = await toStream(index.get(key)).take(2).toArray();
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

    getAll(prefix?: Uint8Array): Stream<T> {
        return toStream(
            queryStartsWith(this.primaryKeyRaw, prefix ?? new Uint8Array())
        ).map(x => x.value.snapshot());
    }

    async unsafe_deleteAll() {
        for await (const {pk} of this.getAll()) {
            await this.unsafe_delete(pk);
        }
    }

    async unsafe_delete(pk: IndexKey) {
        const doc = await this.primary.get(pk);
        if (!doc) {
            throw new Error('doc not found: ' + pk);
        }
        const prev = doc.snapshot();
        const next = undefined;

        await whenAll([
            this.primary.delete(pk),
            ...[...this.indexes.values()].map(x => x.sync(prev, next)),
        ]);
    }

    query(indexName: string, condition: Condition<IndexKey>): Stream<T> {
        const index = this._index(indexName);

        return this._mapToDocs(index.query(condition));
    }

    async update(id: IndexKey, recipe: Recipe<T>): Promise<T> {
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
        await this._put(prev, doc, diff);

        return doc.snapshot();
    }

    // todo: add tests
    async apply(
        pk: IndexKey,
        diff: CrdtDiff<T>,
        updateChecker?: UpdateChecker<T>
    ): Promise<void> {
        let doc: Crdt<T> | undefined = await this.primary.get(pk);
        let prev: T | undefined;
        if (doc) {
            prev = doc.snapshot();
            doc.apply(diff);
        } else {
            prev = undefined;
            doc = Crdt.load(diff);
        }

        if (compareIndexKey(doc.snapshot().pk, pk) !== 0) {
            throw new Error('invalid diff: diff updates id ' + pk);
        }

        if (prev && updateChecker) {
            updateChecker(prev, doc.snapshot());
        }

        await this._put(prev, doc, diff);
    }

    async create(doc: T): Promise<T> {
        const existing = await this.primary.get(doc.pk);
        if (existing) {
            throw new Error(`doc ${indexKeyToString(doc.pk)} already exists`);
        }

        return await this.put(doc);
    }

    async put(doc: T): Promise<T> {
        const existing = await this.primary.get(doc.pk);

        const now = getNow();
        const crdt = Crdt.from({...doc, createdAt: now, updatedAt: now});
        await this._put(existing?.snapshot(), crdt, crdt.state());

        return crdt.snapshot();
    }

    private _index(indexName: string): Index<T> {
        const index = this.indexes.get(indexName);
        if (!index) {
            throw new Error('index not found: ' + indexName);
        }
        return index;
    }

    async _put(
        prev: T | undefined,
        next: Crdt<T>,
        diff: CrdtDiff<T>
    ): Promise<void> {
        const nextSnapshot = next.snapshot();
        this.schema.parse(nextSnapshot);
        await whenAll([
            this.primary.put(nextSnapshot.pk, next),
            ...[...this.indexes.values()].map(x =>
                x.sync(prev, next.snapshot())
            ),
            ...this.constraints.map(async c => {
                const result = c.verify(nextSnapshot);
                if (!result) {
                    throw new ConstraintError(c.name);
                }
            }),
            this.onChange(nextSnapshot.pk, diff),
        ]);
    }

    private _mapToDocs(ids: AsyncIterable<IndexKey>): Stream<T> {
        return toStream(ids)
            .mapParallel(id => this.primary.get(id))
            .assert(x => x !== undefined)
            .map(doc => doc.snapshot());
    }
}
