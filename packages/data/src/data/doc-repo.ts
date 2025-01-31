import {z, ZodType} from 'zod';
import {astream, AsyncStream} from '../async-stream.js';
import {Cx} from '../context.js';
import {Crdt, CrdtCodec, CrdtDiff} from '../crdt/crdt.js';
import {AppError} from '../errors.js';
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
    cx: Cx,
    id: T['id'],
    diff: CrdtDiff<T>
) => Promise<void>;

export interface DocStoreOptions<T extends Doc> {
    tx: Uint8Transaction;
    indexes: IndexMap<T>;
    schema: ZodType<T>;
    onChange: OnDocChange<T>;
}

export type Recipe<T> = (cx: Cx, doc: T) => T | void;

export class DocRepo<T extends Doc> {
    private readonly indexes: Map<string, Index<T>>;
    private readonly primary: Transaction<Uuid, Crdt<T>>;
    private readonly primaryKeyRaw: Transaction<Uint8Array, Crdt<T>>;
    private readonly onChange: OnDocChange<T>;
    private readonly schema: ZodType<T>;

    constructor(cx: Cx, {tx, indexes, onChange, schema}: DocStoreOptions<T>) {
        this.indexes = new Map(
            Object.entries(indexes).map(([indexName, spec]) => {
                if (indexName.indexOf('/') !== -1) {
                    throw new AppError(
                        cx,
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

    async getById(cx: Cx, id: Uuid): Promise<T | undefined> {
        const doc = await this.primary.get(cx, id);
        return doc?.snapshot(cx);
    }

    get(cx: Cx, indexName: string, key: IndexKey): AsyncStream<T> {
        const index = this._index(cx, indexName);
        return this._mapToDocs(index.get(cx, key));
    }

    async getUnique(
        cx: Cx,
        indexName: string,
        key: IndexKey
    ): Promise<T | undefined> {
        const index = this._index(cx, indexName);
        const ids = await astream(index.get(cx, key)).take(2).toArray(cx);
        if (ids.length > 1) {
            throw new AppError(
                cx,
                `index ${indexName} contains multiple docs for the key: ${key}`
            );
        } else if (ids.length === 1) {
            return await this.getById(cx, ids[0]);
        } else {
            return undefined;
        }
    }

    getAll(cx: Cx, prefix?: Uint8Array): AsyncStream<T> {
        return astream(
            queryStartsWith(cx, this.primaryKeyRaw, prefix ?? new Uint8Array())
        ).map((_mapCx, x) => x.value.snapshot(cx));
    }

    query(
        cx: Cx,
        indexName: string,
        condition: Condition<IndexKey>
    ): AsyncStream<T> {
        const index = this._index(cx, indexName);

        return this._mapToDocs(index.query(cx, condition));
    }

    async update(cx: Cx, id: Uuid, recipe: Recipe<T>): Promise<T> {
        const doc = await this.primary.get(cx, id);
        if (!doc) {
            throw new AppError(cx, 'doc not found: ' + id);
        }

        const prev = doc.snapshot(cx);
        const diff = doc.update(cx, (cx, draft) => {
            const result = recipe(cx, draft) ?? draft;

            result.updatedAt = getNow();

            return result;
        });
        if (!diff) {
            // no change were made to the document
            return prev;
        }
        const next = doc.snapshot(cx);
        this.ensureValid(next);

        await whenAll(cx, [
            this.primary.put(cx, id, doc),
            this._sync(cx, id, prev, next, diff),
        ]);

        return next;
    }

    // todo: add tests
    async apply(
        cx: Cx,
        id: Uuid,
        diff: CrdtDiff<T>,
        updateChecker?: UpdateChecker<T>
    ): Promise<void> {
        let doc: Crdt<T> | undefined = await this.primary.get(cx, id);
        let prev: T | undefined;
        let next: T;
        if (doc) {
            prev = doc.snapshot(cx);
            doc.apply(diff);
            next = doc.snapshot(cx);
        } else {
            prev = undefined;
            doc = Crdt.load(diff);
            next = doc.snapshot(cx);
        }

        if (next.id !== id) {
            throw new AppError(cx, 'invalid diff: diff updates id ' + id);
        }

        if (prev && updateChecker) {
            updateChecker(cx, prev, next);
        }

        this.ensureValid(next);
    }

    async create(cx: Cx, doc: T): Promise<T> {
        const existing = await this.primary.get(cx, doc.id);
        if (existing) {
            throw new AppError(cx, `doc ${doc.id} already exists`);
        }

        const now = getNow();
        const crdt = Crdt.from(cx, {...doc, createdAt: now, updatedAt: now});
        await whenAll(cx, [
            this.primary.put(cx, doc.id, crdt),
            this._sync(cx, doc.id, undefined, doc, crdt.state()),
        ]);

        return crdt.snapshot(cx);
    }

    private _index(cx: Cx, indexName: string): Index<T> {
        const index = this.indexes.get(indexName);
        if (!index) {
            throw new AppError(cx, 'index not found: ' + indexName);
        }
        return index;
    }

    private async _sync(
        cx: Cx,
        id: Uuid,
        prev: T | undefined,
        next: T | undefined,
        diff: CrdtDiff<T>
    ): Promise<void> {
        await whenAll(cx, [
            ...[...this.indexes.values()].map(x => x.sync(cx, prev, next)),
            this.onChange(cx, id, diff),
        ]);
    }

    private _mapToDocs(ids: AsyncIterable<Uuid>): AsyncStream<T> {
        return astream(ids)
            .mapParallel((cx, id) => this.primary.get(cx, id))
            .assert((cx, x) => x !== undefined)
            .map((cx, doc) => doc.snapshot(cx));
    }

    private ensureValid(value: T) {
        this.schema.parse(value);
    }
}
