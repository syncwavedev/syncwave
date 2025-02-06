import {validate} from 'uuid';
import {z, ZodType} from 'zod';
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
import {Stream, toStream} from '../stream.js';
import {getNow, Timestamp, zTimestamp} from '../timestamp.js';
import {pipe, whenAll} from '../utils.js';
import {Uuid, UuidCodec, zUuid} from '../uuid.js';
import {UpdateChecker} from './update-checker.js';

export class ConstraintError extends Error {
    constructor(public readonly constraintName: string) {
        super('constraint failed: ' + constraintName);
        this.name = 'ConstraintError';
    }
}

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

export interface Constraint<T extends Doc> {
    readonly name: string;
    readonly verify: (doc: T) => Promise<boolean>;
}

export interface DocStoreOptions<T extends Doc> {
    tx: Uint8Transaction;
    indexes: IndexMap<T>;
    schema: ZodType<T>;
    onChange: OnDocChange<T>;
    constraints: readonly Constraint<T>[];
}

export type Recipe<T> = (doc: T) => T | void;

function indexKeyToUuid(key: IndexKey): Uuid {
    const result = key[0];
    if (!validate(result)) {
        throw new Error('Doc: invalid index key: ' + key);
    }

    return result as Uuid;
}

export class DocRepo<T extends Doc> {
    private readonly indexes: Map<string, Index<T>>;
    private readonly primary: Transaction<Uuid, Crdt<T>>;
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
                        idSelector: x => [x.id],
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
        this.constraints = constraints;
    }

    async getById(id: Uuid): Promise<T | undefined> {
        const doc = await this.primary.get(id);
        return doc?.snapshot();
    }

    get(indexName: string, key: IndexKey): Stream<T> {
        const index = this._index(indexName);
        return this._mapToDocs(toStream(index.get(key)).map(indexKeyToUuid));
    }

    async getUnique(indexName: string, key: IndexKey): Promise<T | undefined> {
        const index = this._index(indexName);
        const ids = await toStream(index.get(key))
            .take(2)
            .map(indexKeyToUuid)
            .toArray();
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
        for await (const {id} of this.getAll()) {
            await this.unsafe_delete(id);
        }
    }

    async unsafe_delete(id: Uuid) {
        const doc = await this.primary.get(id);
        if (!doc) {
            throw new Error('doc not found: ' + id);
        }
        const prev = doc.snapshot();
        const next = undefined;

        await whenAll([
            this.primary.delete(id),
            ...[...this.indexes.values()].map(x => x.sync(prev, next)),
        ]);
    }

    query(indexName: string, condition: Condition<IndexKey>): Stream<T> {
        const index = this._index(indexName);

        return this._mapToDocs(
            toStream(index.query(condition)).map(indexKeyToUuid)
        );
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
        await this._put(prev, doc, diff);

        return doc.snapshot();
    }

    // todo: add tests
    async apply(
        id: Uuid,
        diff: CrdtDiff<T>,
        updateChecker?: UpdateChecker<T>
    ): Promise<void> {
        let doc: Crdt<T> | undefined = await this.primary.get(id);
        let prev: T | undefined;
        if (doc) {
            prev = doc.snapshot();
            doc.apply(diff);
        } else {
            prev = undefined;
            doc = Crdt.load(diff);
        }

        if (doc.snapshot().id !== id) {
            throw new Error('invalid diff: diff updates id ' + id);
        }

        if (prev && updateChecker) {
            updateChecker(prev, doc.snapshot());
        }

        await this._put(prev, doc, diff);
    }

    async create(doc: T): Promise<T> {
        const existing = await this.primary.get(doc.id);
        if (existing) {
            throw new Error(`doc ${doc.id} already exists`);
        }

        const now = getNow();
        const crdt = Crdt.from({...doc, createdAt: now, updatedAt: now});
        await this._put(undefined, crdt, crdt.state());

        return crdt.snapshot();
    }

    private _index(indexName: string): Index<T> {
        const index = this.indexes.get(indexName);
        if (!index) {
            throw new Error('index not found: ' + indexName);
        }
        return index;
    }

    private async _put(
        prev: T | undefined,
        next: Crdt<T>,
        diff: CrdtDiff<T>
    ): Promise<void> {
        const nextSnapshot = next.snapshot();
        this.schema.parse(nextSnapshot);
        await whenAll([
            this.primary.put(nextSnapshot.id, next),
            ...[...this.indexes.values()].map(x =>
                x.sync(prev, next.snapshot())
            ),
            ...this.constraints.map(async c => {
                const result = c.verify(nextSnapshot);
                if (!result) {
                    throw new ConstraintError(c.name);
                }
            }),
            this.onChange(nextSnapshot.id, diff),
        ]);
    }

    private _mapToDocs(ids: AsyncIterable<Uuid>): Stream<T> {
        return toStream(ids)
            .mapParallel(id => this.primary.get(id))
            .assert(x => x !== undefined)
            .map(doc => doc.snapshot());
    }
}
