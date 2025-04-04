import {Type} from '@sinclair/typebox';
import {context} from '../context.js';
import {Crdt, CrdtCodec, type CrdtDiff} from '../crdt/crdt.js';
import {AppError} from '../errors.js';
import {createIndex, type Index} from '../kv/data-index.js';
import {
    type AppTransaction,
    type Condition,
    isolate,
    type Transaction,
    withCodec,
} from '../kv/kv-store.js';
import {Stream, toStream} from '../stream.js';
import {getNow, type Timestamp, zTimestamp} from '../timestamp.js';
import {compareTuple, stringifyTuple, type Tuple} from '../tuple.js';
import {checkValue, type ToSchema} from '../type.js';
import {pipe, whenAll} from '../utils.js';
import {type TransitionChecker} from './transition-checker.js';

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
    deletedAt?: Timestamp;
}

export function zDoc<T extends Tuple>(pk: ToSchema<T>) {
    return Type.Object({
        pk: pk,
        createdAt: zTimestamp(),
        updatedAt: zTimestamp(),
        deletedAt: Type.Optional(zTimestamp()),
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

export interface ChangeOptions<T extends Doc<Tuple>> {
    pk: T['pk'];
    kind: 'create' | 'update';
    diff: CrdtDiff<T>;
}

export type OnDocChange<T extends Doc<Tuple>> = (
    options: ChangeOptions<T>
) => Promise<void>;

export interface Constraint<T extends Doc<Tuple>> {
    readonly name: string;
    readonly verify: (doc: T) => Promise<void | string>;
}

export interface DocStoreOptions<T extends Doc<Tuple>> {
    tx: AppTransaction;
    indexes: IndexMap<T>;
    schema: ToSchema<T>;
    onChange: OnDocChange<T>;
    scheduleTrigger: (effect: () => Promise<void>) => void;
    constraints: readonly Constraint<T>[];
    upgrade?: Recipe<any>;
}

export type Recipe<T> = (doc: T) => void;

export type CrdtDoc<T> = T & {state: CrdtDiff<T>};

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

    get(
        indexName: string,
        key: Tuple,
        includeDeleted?: boolean
    ): Stream<CrdtDoc<T>> {
        return context().runChild({span: 'repo.get'}, () => {
            return this.rawRepo.get(indexName, key, includeDeleted);
        });
    }

    async getUnique(
        indexName: string,
        key: Tuple,
        includeDeleted?: boolean
    ): Promise<CrdtDoc<T> | undefined> {
        return await context().runChild({span: 'repo.get'}, async () => {
            return await this.rawRepo.getUnique(indexName, key, includeDeleted);
        });
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
    private readonly primary: Transaction<Tuple, Crdt<T>>;
    private readonly primaryKeyRaw: AppTransaction<Crdt<T>>;
    private readonly onChange: OnDocChange<T>;
    private readonly schema: ToSchema<T>;
    // todo: add tests
    private readonly constraints: readonly Constraint<T>[];
    // todo: add tests
    private readonly upgrade: Recipe<any>;
    private readonly scheduleTrigger: (trigger: () => Promise<void>) => void;

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
        this.scheduleTrigger = options.scheduleTrigger;
    }

    async getById(
        id: Tuple,
        includeDeleted?: boolean
    ): Promise<CrdtDoc<T> | undefined> {
        const doc = await this.getUpgrade(id);
        if (!doc) {
            return undefined;
        }

        const snapshot = doc.snapshot();
        if (!includeDeleted && snapshot?.deletedAt) {
            return undefined;
        }

        return Object.assign(snapshot, {state: doc.state()});
    }

    get(
        indexName: string,
        key: Tuple,
        includeDeleted?: boolean
    ): Stream<CrdtDoc<T>> {
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
    ): Promise<CrdtDoc<T> | undefined> {
        const index = this._index(indexName);
        const ids = await toStream(index.get(key)).take(2).toArray();
        if (ids.length > 1) {
            throw new AppError(
                `index ${indexName} contains multiple docs for the key: ${stringifyTuple(key)}`
            );
        } else if (ids.length === 1) {
            return await this.getById(ids[0], includeDeleted);
        } else {
            return undefined;
        }
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
        const doc = await this.primary.get(id);
        if (!doc || (!includeDeleted && doc.snapshot().deletedAt)) {
            throw new AppError('doc not found: ' + stringifyTuple(id));
        }

        const diff = doc.update(draft => {
            this.upgrade(draft);
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

    // todo: add tests
    async apply(
        pk: Tuple,
        diff: CrdtDiff<T>,
        transitionChecker: TransitionChecker<T> | undefined
    ) {
        const existingDoc = await this.getUpgrade(pk);

        let prev: T | undefined;
        let next: Crdt<T>;
        if (existingDoc) {
            prev = existingDoc.snapshot();
            next = existingDoc;
            next.apply(diff);
        } else {
            prev = undefined;
            next = Crdt.load(diff);
        }

        const upgradeDiff = next.update(draft => {
            this.upgrade(draft);
        });

        const resultDiff = upgradeDiff ? Crdt.merge([upgradeDiff, diff]) : diff;

        if (compareTuple(next.snapshot().pk, pk) !== 0) {
            throw new AppError(
                'invalid diff: diff updates primary key ' + stringifyTuple(pk)
            );
        }

        await this._put({
            prev,
            next,
            diff: resultDiff,
            transitionChecker: transitionChecker,
        });

        return {
            before: prev,
            after: next.snapshot(),
        };
    }

    async create(doc: T): Promise<T> {
        const existing = await this.primary.get(doc.pk);
        if (existing) {
            throw new AppError(`doc ${stringifyTuple(doc.pk)} already exists`);
        }

        return await this.put(doc);
    }

    async put(doc: T): Promise<T> {
        const existing = await this.primary.get(doc.pk);

        const now = getNow();
        const crdt = Crdt.from({...doc, createdAt: now, updatedAt: now});
        await this._put({
            prev: existing?.snapshot(),
            next: crdt,
            diff: crdt.state(),
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

    private async getUpgrade(pk: Tuple): Promise<Crdt<T> | undefined> {
        const doc = await this.primary.get(pk);

        // ignore diff, because getUpgrade is a readonly operation
        doc?.update(this.upgrade);
        return doc;
    }

    private async _put(params: {
        prev: T | undefined;
        next: Crdt<T>;
        diff: CrdtDiff<T>;
        transitionChecker?: TransitionChecker<T>;
    }): Promise<void> {
        const nextSnapshot = params.next.snapshot();
        checkValue(this.schema, nextSnapshot);
        await whenAll([
            params
                .transitionChecker?.(params.prev, nextSnapshot)
                .then(({errors}) => {
                    if (errors.length > 0) {
                        throw new AppError(
                            'transition checker failed: ' + errors.join(', ')
                        );
                    }
                }) ?? Promise.resolve(),
            this.primary.put(nextSnapshot.pk, params.next),
            ...[...this.indexes.values()].map(x =>
                x.sync(params.prev, nextSnapshot)
            ),
            this.onChange({
                pk: nextSnapshot.pk,
                diff: params.diff,
                kind: params.prev === undefined ? 'create' : 'update',
            }),
        ]);

        this.constraints.forEach(c =>
            this.scheduleTrigger(async () => {
                const result = await c.verify(nextSnapshot);
                if (result) {
                    throw new ConstraintError(c.name, result);
                }
            })
        );
    }

    private _mapToDocs(
        ids: AsyncIterable<Tuple>,
        message: string,
        includeDeleted?: boolean
    ): Stream<CrdtDoc<T>> {
        return toStream(ids)
            .mapParallel(id => this.getUpgrade(id))
            .assert(x => x !== undefined, message)
            .map(doc => ({...doc.snapshot(), state: doc.state()}))
            .filter(x => includeDeleted || !x.deletedAt);
    }
}
