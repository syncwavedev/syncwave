import {AbstractSnapshot} from 'abstract-level';
import {
    ClassicLevel,
    type BatchOperation,
    type IteratorOptions,
} from 'classic-level';
import {
    SingleProcessMvccStore,
    log,
    type Condition,
    type Entry,
    type Snapshot,
    type Uint8Entry,
} from 'syncwave';

export interface ClassicLevelOptions {
    dbPath: string;
}

class LevelDbSnapshot implements Snapshot<Uint8Array, Uint8Array> {
    constructor(
        private readonly db: ClassicLevel<Uint8Array, Uint8Array>,
        private snapshot: AbstractSnapshot
    ) {}
    base = undefined;
    keysRead = 0;
    keysReturned = 0;

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        this.keysRead++;
        this.keysReturned++;
        const result = await this.db.get(key, {snapshot: this.snapshot});

        if (result) {
            return new Uint8Array(result);
        }

        return undefined;
    }

    async *query(
        condition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const iterOptions: IteratorOptions<Uint8Array, Uint8Array> = {
            reverse: !!condition.lte || !!condition.lt,
            snapshot: this.snapshot,
        };
        // we have to assign only relevant condition, because classic-level
        // treats undefined as a condition
        if (condition.gte) {
            iterOptions.gte = condition.gte;
        }
        if (condition.gt) {
            iterOptions.gt = condition.gt;
        }
        if (condition.lte) {
            iterOptions.lte = condition.lte;
        }
        if (condition.lt) {
            iterOptions.lt = condition.lt;
        }
        for await (const [key, value] of this.db.iterator(iterOptions)) {
            this.keysRead++;
            this.keysReturned++;
            yield {
                key,
                value: new Uint8Array(value),
            };
        }
    }
}

/**
 * SingleProcessMvccStore has in-memory state, so it can only be used in single process environment.
 * Notably, NodeJS cluster mode is not supported. It's intended to be used only in self-hosted
 * environments, where the server is running in a single process.
 */
export class LevelDbStore extends SingleProcessMvccStore {
    private readonly db: ClassicLevel<Uint8Array, Uint8Array>;

    static async create(options: ClassicLevelOptions) {
        const store = new LevelDbStore(options);
        await store.db.open();
        return store;
    }

    private constructor(options: ClassicLevelOptions) {
        super();

        this.db = new ClassicLevel<Uint8Array, Uint8Array>(options.dbPath, {
            valueEncoding: 'view',
            keyEncoding: 'view',
        });
    }

    async snapshot<R>(
        fn: (snapshot: Snapshot<Uint8Array, Uint8Array>) => Promise<R>
    ): Promise<R> {
        const levelSnap = this.db.snapshot();
        try {
            return await fn(new LevelDbSnapshot(this.db, levelSnap));
        } finally {
            levelSnap.close().catch(error => {
                log.error({error, msg: 'Failed to close LevelDB snapshot'});
            });
        }
    }

    protected override async atomicWrite(
        puts: Uint8Entry[],
        deletes: Uint8Array[]
    ): Promise<void> {
        const batch: Array<
            BatchOperation<typeof this.db, Uint8Array, Uint8Array>
        > = puts
            .map(
                ({
                    key,
                    value,
                }): BatchOperation<typeof this.db, Uint8Array, Uint8Array> => ({
                    type: 'put',
                    key,
                    value,
                })
            )
            .concat(
                deletes.map(key => ({
                    type: 'del',
                    key,
                }))
            );

        try {
            await this.db.batch(batch, {sync: true});
        } catch (error) {
            log.error({error, msg: 'Failed to write to LevelDB store'});
            throw error;
        }
    }

    override close(reason: unknown): void {
        super.close(reason);

        this.db.close().catch(error => {
            log.error({error, msg: 'Failed to close LevelDB store: ' + reason});
        });
    }
}
