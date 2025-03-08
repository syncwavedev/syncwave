import {
    mapCondition,
    type Condition,
    type Entry,
    type KvStore,
    type Mapper,
    type Snapshot,
    type Transaction,
} from './kv-store.js';

export class SnapshotMapper<
    TKeyPrivate,
    TKeyPublic,
    TValuePrivate,
    TValuePublic,
> implements Snapshot<TKeyPublic, TValuePublic>
{
    constructor(
        private snapshot: Snapshot<TKeyPrivate, TValuePrivate>,
        protected keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        protected valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    async get(key: TKeyPublic): Promise<TValuePublic | undefined> {
        const result = await this.snapshot.get(this.keyMapper.encode(key));
        if (result) {
            return this.valueMapper.decode(result);
        } else {
            return undefined;
        }
    }

    async *query(
        condition: Condition<TKeyPublic>
    ): AsyncIterable<Entry<TKeyPublic, TValuePublic>> {
        const entries = this.snapshot.query(
            projectCondition(condition, this.keyMapper)
        );
        for await (const {key, value} of entries) {
            yield {
                key: this.keyMapper.decode(key),
                value: this.valueMapper.decode(value),
            };
        }
    }
}

export class TransactionMapper<
        TKeyPrivate,
        TKeyPublic,
        TValuePrivate,
        TValuePublic,
    >
    extends SnapshotMapper<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>
    implements Transaction<TKeyPublic, TValuePublic>
{
    constructor(
        private tx: Transaction<TKeyPrivate, TValuePrivate>,
        keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {
        super(tx, keyMapper, valueMapper);
    }

    async put(key: TKeyPublic, value: TValuePublic): Promise<void> {
        return await this.tx.put(
            this.keyMapper.encode(key),
            this.valueMapper.encode(value)
        );
    }

    async delete(key: TKeyPublic): Promise<void> {
        await this.tx.delete(this.keyMapper.encode(key));
    }
}

export class KvStoreMapper<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>
    implements KvStore<TKeyPublic, TValuePublic>
{
    constructor(
        private store: KvStore<TKeyPrivate, TValuePrivate>,
        private keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        private valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    snapshot<TResult>(
        fn: (tx: Snapshot<TKeyPublic, TValuePublic>) => Promise<TResult>
    ): Promise<TResult> {
        return this.store.snapshot(tx =>
            fn(new SnapshotMapper(tx, this.keyMapper, this.valueMapper))
        );
    }

    transact<TResult>(
        fn: (tx: Transaction<TKeyPublic, TValuePublic>) => Promise<TResult>
    ): Promise<TResult> {
        return this.store.transact(tx =>
            fn(new TransactionMapper(tx, this.keyMapper, this.valueMapper))
        );
    }

    close(reason: unknown): void {
        this.store.close(reason);
    }
}

function projectCondition<TKeySource, TKeyTarget>(
    condition: Condition<TKeyTarget>,
    keyMapper: Mapper<TKeySource, TKeyTarget>
): Condition<TKeySource> {
    return mapCondition<TKeyTarget, Condition<TKeySource>>(condition, {
        gt: cond => ({gt: keyMapper.encode(cond.gt)}),
        gte: cond => ({gte: keyMapper.encode(cond.gte)}),
        lt: cond => ({lt: keyMapper.encode(cond.lt)}),
        lte: cond => ({lte: keyMapper.encode(cond.lte)}),
    });
}
