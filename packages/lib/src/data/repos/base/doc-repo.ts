import {MsgpackCodec} from '../../../codec.js';
import {context} from '../../../context.js';
import {AppError} from '../../../errors.js';
import {createIndex, type Index} from '../../../kv/data-index.js';
import {
    type AppTransaction,
    type Condition,
    isolate,
    type Transaction,
    withCodec,
} from '../../../kv/kv-store.js';
import {Stream, toStream} from '../../../stream.js';
import {stringifyTuple, type Tuple} from '../../../tuple.js';
import {checkValue, type ToSchema} from '../../../type.js';
import {pipe, whenAll} from '../../../utils.js';
import {type TransitionChecker} from '../../transition-checker.js';
import {ConstraintError, type Doc, type IndexMap} from './doc.js';

export interface DocChangeOptions<T extends Doc<Tuple>> {
    pk: T['pk'];
    kind: 'create' | 'update';
    after: T;
}

export type OnDocChange<T extends Doc<Tuple>> = (
    options: DocChangeOptions<T>
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

export interface QueryOptions {
    // false by default
    excludeDeleted?: boolean;
}

export interface QueryOptionsRequired {
    excludeDeleted: boolean;
}

export class DocRepo<T extends Doc<Tuple>> {
    public readonly rawRepo: DocRepoImpl<T>;

    constructor(options: DocStoreOptions<T>) {
        this.rawRepo = new DocRepoImpl<T>(options);
    }

    scan(): Stream<T> {
        return context().runChild({span: 'repo.scan'}, () => {
            return this.rawRepo.scan();
        });
    }

    async getById(id: T['pk'], options?: QueryOptions): Promise<T | undefined> {
        return await context().runChild({span: 'repo.getById'}, async () => {
            return await this.rawRepo.getById(id, options);
        });
    }

    get(indexName: string, key: Tuple, options?: QueryOptions): Stream<T> {
        return context().runChild({span: 'repo.get'}, () => {
            return this.rawRepo.get(indexName, key, options);
        });
    }

    async getUnique(
        indexName: string,
        key: Tuple,
        options?: QueryOptions
    ): Promise<T | undefined> {
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
    private readonly primary: Transaction<Tuple, T>;
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
                        tx: isolate(['indexes', indexName])(options.tx),
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
        this.primary = pipe(
            options.tx,
            isolate(['docs']),
            withCodec(new MsgpackCodec())
        );
        this.onChange = options.onChange;
        this.schema = options.schema;
        this.constraints = options.constraints;
        this.scheduleTrigger = options.scheduleTrigger;
    }

    scan(): Stream<T> {
        return toStream(this._scan());
    }

    private async *_scan(): AsyncIterable<T> {
        for await (const {value} of this.primary.query({gte: []})) {
            yield value;
        }
    }

    async getById(id: Tuple, options?: QueryOptions): Promise<T | undefined> {
        const doc = await this.primary.get(id);
        if (!doc) {
            return undefined;
        }

        if (options?.excludeDeleted && doc?.deletedAt) {
            return undefined;
        }

        return doc;
    }

    get(indexName: string, key: Tuple, options?: QueryOptions): Stream<T> {
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
    ): Promise<T | undefined> {
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

    async create(doc: T): Promise<T> {
        const existing = await this.primary.get(doc.pk);
        if (existing) {
            throw new AppError(`doc ${stringifyTuple(doc.pk)} already exists`);
        }

        return await this.put(doc);
    }

    async put(doc: T): Promise<T> {
        const existing = await this.primary.get(doc.pk);

        await this._put({
            prev: existing,
            next: doc,
        });

        return doc;
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
        next: T;
        transitionChecker?: TransitionChecker<T>;
    }): Promise<void> {
        checkValue(this.schema, params.next);
        await whenAll([
            params
                .transitionChecker?.(params.prev, params.next)
                .then(({errors}) => {
                    if (errors.length > 0) {
                        throw new AppError(
                            'transition checker failed: ' + errors.join(', ')
                        );
                    }
                }) ?? Promise.resolve(),
            this.primary.put(params.next.pk, params.next),
            ...[...this.indexes.values()].map(x =>
                x.sync(params.prev, params.next)
            ),
            this.onChange({
                pk: params.next.pk,
                kind: params.prev === undefined ? 'create' : 'update',
                after: params.next,
            }),
        ]);

        this.constraints.forEach(c =>
            this.scheduleTrigger(async () => {
                const result = await c.verify(params.next);
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
    ): Stream<T> {
        return toStream(ids)
            .mapParallel(id => this.primary.get(id))
            .assert(x => x !== undefined, message)
            .filter(x => !options?.excludeDeleted || !x.deletedAt);
    }
}
