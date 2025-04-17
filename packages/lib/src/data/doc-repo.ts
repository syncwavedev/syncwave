import {type Static, Type} from '@sinclair/typebox';
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
import {getNow, Timestamp} from '../timestamp.js';
import {compareTuple, stringifyTuple, type Tuple} from '../tuple.js';
import {checkValue, type ToSchema} from '../type.js';
import {assert, pipe, whenAll} from '../utils.js';
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

export function Doc<T extends Tuple>(pk: ToSchema<T>) {
    return Type.Object({
        pk: pk,
        createdAt: Timestamp(),
        updatedAt: Timestamp(),
        deletedAt: Type.Optional(Timestamp()),
    });
}

export interface Doc<TKey extends Tuple>
    extends Static<ReturnType<typeof Doc<TKey>>> {}

export type IndexSpec<T> =
    | {
          readonly unique?: boolean | undefined;
          readonly key: (x: T) => Tuple[];
          readonly filter?: (x: T) => boolean;
      }
    | ((x: T) => Tuple[]);

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
}

export type Recipe<T> = (doc: T) => void | undefined;

export type CrdtDoc<T> = T & {state: CrdtDiff<T>};

export interface QueryOptions {
    // false by default
    includeDeleted?: boolean;
}

export class DocRepo<T extends Doc<Tuple>> {
    public readonly rawRepo: DocRepoImpl<T>;

    constructor(options: DocStoreOptions<T>) {
        this.rawRepo = new DocRepoImpl<T>(options);
    }

    scan(): Stream<CrdtDoc<T>> {
        return context().runChild({span: 'repo.scan'}, () => {
            return this.rawRepo.scan();
        });
    }

    async getById(
        id: Tuple,
        options?: QueryOptions
    ): Promise<CrdtDoc<T> | undefined> {
        return await context().runChild({span: 'repo.getById'}, async () => {
            return await this.rawRepo.getById(id, options);
        });
    }

    get(
        indexName: string,
        key: Tuple,
        options?: QueryOptions
    ): Stream<CrdtDoc<T>> {
        return context().runChild({span: 'repo.get'}, () => {
            return this.rawRepo.get(indexName, key, options);
        });
    }

    async getUnique(
        indexName: string,
        key: Tuple,
        options?: QueryOptions
    ): Promise<CrdtDoc<T> | undefined> {
        return await context().runChild({span: 'repo.get'}, async () => {
            return await this.rawRepo.getUnique(indexName, key, options);
        });
    }

    query(
        indexName: string,
        condition: Condition<Tuple>,
        options?: QueryOptions
    ): Stream<T> {
        return context().runChild({span: 'repo.query'}, () => {
            return this.rawRepo.query(indexName, condition, options);
        });
    }

    async update(
        id: Tuple,
        recipe: Recipe<T>,
        options?: QueryOptions
    ): Promise<T> {
        return await context().runChild({span: 'repo.update'}, async () => {
            return await this.rawRepo.update(id, recipe, options);
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
    private readonly scheduleTrigger: (trigger: () => Promise<void>) => void;

    constructor(options: DocStoreOptions<T>) {
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
                        filter:
                            typeof spec === 'function'
                                ? undefined
                                : spec.filter,
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

    scan(): Stream<CrdtDoc<T>> {
        return toStream(this._scan());
    }

    private async *_scan(): AsyncIterable<CrdtDoc<T>> {
        for await (const {value} of this.primaryKeyRaw.query({gte: []})) {
            yield {
                ...value.snapshot(),
                state: value.state(),
            };
        }
    }

    async getById(
        id: Tuple,
        options?: QueryOptions
    ): Promise<CrdtDoc<T> | undefined> {
        const doc = await this.primary.get(id);
        if (!doc) {
            return undefined;
        }

        const snapshot = doc.snapshot();
        if (!options?.includeDeleted && snapshot?.deletedAt) {
            return undefined;
        }

        return Object.assign(snapshot, {state: doc.state()});
    }

    get(
        indexName: string,
        key: Tuple,
        options?: QueryOptions
    ): Stream<CrdtDoc<T>> {
        const index = this._index(indexName);
        return this._mapToDocs(
            index.get(key),
            'repo.get: index lookup',
            options
        );
    }

    async getUnique(
        indexName: string,
        key: Tuple,
        options?: QueryOptions
    ): Promise<CrdtDoc<T> | undefined> {
        const index = this._index(indexName);
        const ids = await toStream(index.get(key)).take(2).toArray();
        if (ids.length > 1) {
            throw new AppError(
                `index ${indexName} contains multiple docs for the key: ${stringifyTuple(key)}`
            );
        } else if (ids.length === 1) {
            return await this.getById(ids[0], options);
        } else {
            return undefined;
        }
    }

    query(
        indexName: string,
        condition: Condition<Tuple>,
        options?: QueryOptions
    ): Stream<T> {
        const index = this._index(indexName);

        return this._mapToDocs(
            index.query(condition),
            'repo.query: index lookup',
            options
        );
    }

    async update(
        id: Tuple,
        recipe: Recipe<T>,
        options?: QueryOptions
    ): Promise<T> {
        const doc = await this.primary.get(id);
        if (!doc || (!options?.includeDeleted && doc.snapshot().deletedAt)) {
            throw new AppError('doc not found: ' + stringifyTuple(id));
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

    // todo: add tests
    async apply(
        pk: Tuple,
        diff: CrdtDiff<T>,
        transitionChecker: TransitionChecker<T> | undefined
    ) {
        const existingDoc = await this.primary.get(pk);

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

        const systemDiff = next.update(draft => {
            draft.updatedAt = getNow();
        });
        assert(systemDiff !== undefined, 'system diff should not be undefined');

        const resultDiff = Crdt.merge([systemDiff, diff]);

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
        options?: QueryOptions
    ): Stream<CrdtDoc<T>> {
        return toStream(ids)
            .mapParallel(id => this.primary.get(id))
            .assert(x => x !== undefined, message)
            .map(doc => ({...doc.snapshot(), state: doc.state()}))
            .filter(x => options?.includeDeleted || !x.deletedAt);
    }
}
