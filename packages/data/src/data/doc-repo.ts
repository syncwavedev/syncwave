import {z, ZodType} from 'zod';
import {context} from '../context.js';
import {
    Crdt,
    CrdtCodec,
    type CrdtDiff,
    type CrdtDiffBase64,
    stringifyCrdtDiff,
} from '../crdt/crdt.js';
import {AppError} from '../errors.js';
import {createIndex, type Index} from '../kv/data-index.js';
import {
    type AppTransaction,
    type Condition,
    isolate,
    queryStartsWith,
    type Transaction,
    withCodec,
} from '../kv/kv-store.js';
import {Stream, toStream} from '../stream.js';
import {getNow, type Timestamp, zTimestamp} from '../timestamp.js';
import {compareTuple, stringifyTuple, type Tuple} from '../tuple.js';
import {type Nothing, pipe, whenAll} from '../utils.js';
import {
    createReadonlyTransitionChecker,
    type ReadonlyDescriptor,
    type TransitionChecker,
} from './transition-checker.js';

export class ConstraintError extends AppError {
    constructor(
        public readonly constraintName: string,
        message: string
    ) {
        super('constraint failed: ' + constraintName + ', ' + message);
        this.name = 'ConstraintError';
    }
}

export interface Doc<TKey extends Tuple> {
    readonly pk: TKey;
    readonly createdAt: Timestamp;
    updatedAt: Timestamp;
    deleted: boolean;
}

export function zDoc<T extends Tuple>(pk: ZodType<T>) {
    return z.object({
        pk: pk,
        createdAt: zTimestamp(),
        updatedAt: zTimestamp(),
        deleted: z.boolean(),
    });
}

export type IndexSpec<T> =
    | {
          readonly unique?: boolean | undefined;
          readonly key: (x: T) => Tuple;
          readonly include?: (x: T) => boolean;
      }
    | ((x: T) => Tuple);

export type IndexMap<T> = Record<string, IndexSpec<T>>;

export type OnDocChange<T extends Doc<Tuple>> = (
    pk: T['pk'],
    diff: CrdtDiff<T>
) => Promise<void>;

export interface Constraint<T extends Doc<Tuple>> {
    readonly name: string;
    readonly verify: (doc: T) => Promise<void | string>;
}

export interface DocStoreOptions<T extends Doc<Tuple>> {
    tx: AppTransaction;
    indexes: IndexMap<T>;
    schema: ZodType<T>;
    onChange: OnDocChange<T>;
    constraints: readonly Constraint<T>[];
    readonly: ReadonlyDescriptor<
        Omit<T, 'updatedAt' | 'createdAt' | 'pk' | 'deleted'>
    >;
    upgrade?: Recipe<any>;
}

export type Recipe<T> = (doc: T) => Nothing;

export type CrdtDoc<T> = T & {state: CrdtDiffBase64<T>};

export class DocRepo<T extends Doc<Tuple>> {
    public readonly rawRepo: DocRepoImpl<T>;

    constructor(options: DocStoreOptions<T>) {
        this.rawRepo = new DocRepoImpl<T>(options);
    }

    async getById(
        id: Tuple,
        includeDeleted?: boolean
    ): Promise<CrdtDoc<T> | undefined> {
        return await context().runChild({span: 'repo.getById'}, async () => {
            return await this.rawRepo.getById(id, includeDeleted);
        });
    }

    get(indexName: string, key: Tuple, includeDeleted?: boolean): Stream<T> {
        return context().runChild({span: 'repo.get'}, () => {
            return this.rawRepo.get(indexName, key, includeDeleted);
        });
    }

    async getUnique(
        indexName: string,
        key: Tuple,
        includeDeleted?: boolean
    ): Promise<T | undefined> {
        return await context().runChild({span: 'repo.get'}, async () => {
            return await this.rawRepo.getUnique(indexName, key, includeDeleted);
        });
    }

    unsafe_getAll(prefix: Tuple = []): Stream<T> {
        return context().runChild({span: 'repo.unsafe_getAll'}, () => {
            return this.rawRepo.unsafe_getAll(prefix);
        });
    }

    async unsafe_deleteAll() {
        return await context().runChild(
            {span: 'repo.unsafe_deleteAll'},
            async () => {
                return await this.rawRepo.unsafe_deleteAll();
            }
        );
    }

    async unsafe_delete(pk: Tuple) {
        return await context().runChild(
            {span: 'repo.unsafe_delete'},
            async () => {
                return await this.rawRepo.unsafe_delete(pk);
            }
        );
    }

    query(
        indexName: string,
        condition: Condition<Tuple>,
        includeDeleted?: boolean
    ): Stream<T> {
        return context().runChild({span: 'repo.query'}, () => {
            return this.rawRepo.query(indexName, condition, includeDeleted);
        });
    }

    async update(
        id: Tuple,
        recipe: Recipe<T>,
        includeDeleted?: boolean
    ): Promise<T> {
        return await context().runChild({span: 'repo.update'}, async () => {
            return await this.rawRepo.update(id, recipe, includeDeleted);
        });
    }

    async apply(
        pk: Tuple,
        diff: CrdtDiff<T>,
        transitionChecker: TransitionChecker<T> | undefined
    ) {
        return await context().runChild({span: 'repo.apply'}, async () => {
            return await this.rawRepo.apply(pk, diff, transitionChecker);
        });
    }

    async create(doc: T): Promise<T> {
        return await context().runChild({span: 'repo.create'}, async () => {
            return await this.rawRepo.create(doc);
        });
    }

    async put(doc: T): Promise<T> {
        return await context().runChild({span: 'repo.put'}, async () => {
            return await this.rawRepo.put(doc);
        });
    }
}

class DocRepoImpl<T extends Doc<Tuple>> {
    private readonly indexes: Map<string, Index<T>>;
    // we use Omit to prevent direct access to the value that might need an upgrade
    private readonly primary: Omit<
        Transaction<Tuple, Crdt<T>>,
        'get' | 'query'
    >;
    private readonly primaryKeyRaw: AppTransaction<Crdt<T>>;
    private readonly onChange: OnDocChange<T>;
    private readonly schema: ZodType<T>;
    // todo: add tests
    private readonly constraints: readonly Constraint<T>[];
    // todo: add tests
    private readonly transitionChecker: TransitionChecker<T>;
    private readonly upgrade: Recipe<any>;

    constructor(options: DocStoreOptions<T>) {
        this.upgrade = options.upgrade ?? (() => {});
        this.indexes = new Map(
            Object.entries(options.indexes).map(([indexName, spec]) => {
                if (indexName.indexOf('/') !== -1) {
                    throw new AppError(
                        'index name cannot contain /: ' + indexName
                    );
                }

                return [
                    indexName,
                    createIndex({
                        tx: isolate(['i', `${indexName}`])(options.tx),
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
            options.tx,
            isolate(['d']),
            withCodec(new CrdtCodec())
        );
        this.primary = this.primaryKeyRaw;
        this.onChange = options.onChange;
        this.schema = options.schema;
        this.constraints = options.constraints;
        this.transitionChecker = createReadonlyTransitionChecker<Doc<Tuple>>({
            createdAt: true,
            pk: true,
            updatedAt: false,
            deleted: false,
            ...options.readonly,
        });
    }

    async getById(
        id: Tuple,
        includeDeleted?: boolean
    ): Promise<CrdtDoc<T> | undefined> {
        const doc = await this._get(id);
        if (!doc) {
            return undefined;
        }

        const snapshot = doc.snapshot();
        if (!includeDeleted && snapshot?.deleted) {
            return undefined;
        }

        return Object.assign(snapshot, {state: stringifyCrdtDiff(doc.state())});
    }

    get(indexName: string, key: Tuple, includeDeleted?: boolean): Stream<T> {
        const index = this._index(indexName);
        return this._mapToDocs(
            index.get(key),
            'repo.get: index lookup',
            includeDeleted
        );
    }

    async getUnique(
        indexName: string,
        key: Tuple,
        includeDeleted?: boolean
    ): Promise<T | undefined> {
        const index = this._index(indexName);
        const ids = await toStream(index.get(key)).take(2).toArray();
        if (ids.length > 1) {
            throw new AppError(
                `index ${indexName} contains multiple docs for the key: ${key}`
            );
        } else if (ids.length === 1) {
            return await this.getById(ids[0], includeDeleted);
        } else {
            return undefined;
        }
    }

    unsafe_getAll(prefix: Tuple = []): Stream<T> {
        return toStream(queryStartsWith(this.primaryKeyRaw, prefix)).map(x =>
            x.value.snapshot()
        );
    }

    async unsafe_deleteAll() {
        for await (const {pk} of this.unsafe_getAll(undefined)) {
            await this.unsafe_delete(pk);
        }
    }

    async unsafe_delete(pk: Tuple) {
        const doc = await this._get(pk);
        if (!doc) {
            throw new AppError('doc not found: ' + pk);
        }
        const prev = doc.snapshot();
        const next = undefined;

        await whenAll([
            this.primary.delete(pk),
            ...[...this.indexes.values()].map(x => x.sync(prev, next)),
        ]);
    }

    query(
        indexName: string,
        condition: Condition<Tuple>,
        includeDeleted?: boolean
    ): Stream<T> {
        const index = this._index(indexName);

        return this._mapToDocs(
            index.query(condition),
            'repo.query: index lookup',
            includeDeleted
        );
    }

    async update(
        id: Tuple,
        recipe: Recipe<T>,
        includeDeleted?: boolean
    ): Promise<T> {
        const doc = await this._get(id);
        if (!doc || (!includeDeleted && doc.snapshot().deleted)) {
            throw new AppError('doc not found: ' + id);
        }

        const diff = doc.update(draft => {
            const result = recipe(draft);

            (result ?? draft).updatedAt = getNow();

            return result;
        });
        if (!diff) {
            // no changes were made to the document
            return doc.snapshot();
        }

        await this.apply(id, diff, undefined);

        return doc.snapshot();
    }

    async apply(
        pk: Tuple,
        diff: CrdtDiff<T>,
        transitionChecker: TransitionChecker<T> | undefined
    ) {
        const existingDoc: Crdt<T> | undefined = await this._get(pk);
        return await this._apply({
            pk,
            existingDoc,
            diff,
            skipTransitionCheck: false,
            transitionChecker,
        });
    }

    // todo: add tests
    private async _apply(params: {
        pk: Tuple;
        existingDoc: Crdt<T> | undefined;
        diff: CrdtDiff<T>;
        skipTransitionCheck: boolean;
        transitionChecker?: TransitionChecker<T>;
    }): Promise<{before: T | undefined; after: T}> {
        return await context().runChild({span: 'repo._apply'}, async () => {
            let prev: T | undefined;
            let next: Crdt<T>;
            if (params.existingDoc) {
                prev = context().runChildSync(
                    {span: 'repo: crdt.snapshot'},
                    () => {
                        return params.existingDoc!.snapshot();
                    }
                );
                next = params.existingDoc;
                context().runChildSync({span: 'repo: crdt.apply'}, () => {
                    next.apply(params.diff);
                });
            } else {
                prev = undefined;
                next = context().runChildSync({span: 'repo: crdt.load'}, () => {
                    return Crdt.load(params.diff);
                });
            }

            if (compareTuple(next.snapshot().pk, params.pk) !== 0) {
                throw new AppError(
                    'invalid diff: diff updates primary key ' +
                        stringifyTuple(params.pk)
                );
            }

            await this._put({
                prev,
                next,
                diff: params.diff,
                skipTransitionCheck: params.skipTransitionCheck,
                transitionChecker: params.transitionChecker,
            });

            return {
                before: prev,
                after: next.snapshot(),
            };
        });
    }

    async create(doc: T): Promise<T> {
        const existing = await this._get(doc.pk);
        if (existing) {
            throw new AppError(`doc ${stringifyTuple(doc.pk)} already exists`);
        }

        return await this.put(doc);
    }

    async put(doc: T): Promise<T> {
        const existing = await this._get(doc.pk);

        const now = getNow();
        const crdt = Crdt.from({...doc, createdAt: now, updatedAt: now});
        await this._put({
            prev: existing?.snapshot(),
            next: crdt,
            diff: crdt.state(),
            skipTransitionCheck: false,
        });

        return crdt.snapshot();
    }

    private _index(indexName: string): Index<T> {
        const index = this.indexes.get(indexName);
        if (!index) {
            throw new AppError('index not found: ' + indexName);
        }
        return index;
    }

    // _get must be used everywhere to ensure upgrade
    private async _get(pk: Tuple): Promise<Crdt<T> | undefined> {
        return await context().runChild({span: 'repo._get'}, async () => {
            const doc = await (this.primary as Transaction<Tuple, Crdt<T>>).get(
                pk
            );

            if (!doc) {
                return doc;
            }

            const original = doc.clone();

            const diff = doc.update(this.upgrade);
            if (!diff) {
                return doc;
            }

            await this._apply({
                pk,
                existingDoc: original,
                diff,
                skipTransitionCheck: true,
            });

            return doc;
        });
    }

    private async _put(params: {
        prev: T | undefined;
        next: Crdt<T>;
        diff: CrdtDiff<T>;
        skipTransitionCheck: boolean;
        transitionChecker?: TransitionChecker<T>;
    }): Promise<void> {
        const nextSnapshot = params.next.snapshot();
        this.schema.parse(nextSnapshot);
        await whenAll([
            params.skipTransitionCheck
                ? Promise.resolve()
                : this.transitionChecker(params.prev, nextSnapshot),
            params.transitionChecker?.(params.prev, nextSnapshot) ??
                Promise.resolve(),
            this.primary.put(nextSnapshot.pk, params.next),
            ...[...this.indexes.values()].map(x =>
                x.sync(params.prev, nextSnapshot)
            ),
            ...this.constraints.map(async c => {
                const result = await c.verify(nextSnapshot);
                if (result) {
                    throw new ConstraintError(c.name, result);
                }
            }),
            this.onChange(nextSnapshot.pk, params.diff),
        ]);
    }

    private _mapToDocs(
        ids: AsyncIterable<Tuple>,
        message: string,
        includeDeleted?: boolean
    ): Stream<T> {
        return toStream(ids)
            .mapParallel(id => this._get(id))
            .assert(x => x !== undefined, message)
            .map(doc => doc.snapshot())
            .filter(x => includeDeleted || !x.deleted);
    }
}
