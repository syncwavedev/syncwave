import {Context} from '../context.js';
import {
    Condition,
    Entry,
    KVStore,
    mapCondition,
    Transaction,
} from './kv-store.js';

export interface Mapper<TPrivate, TPublic> {
    decode(x: TPrivate): TPublic;
    encode(x: TPublic): TPrivate;
}

export class MappedTransaction<
    TKeyPrivate,
    TKeyPublic,
    TValuePrivate,
    TValuePublic,
> implements Transaction<TKeyPublic, TValuePublic>
{
    constructor(
        private target: Transaction<TKeyPrivate, TValuePrivate>,
        private keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        private valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    async get(
        ctx: Context,
        key: TKeyPublic
    ): Promise<TValuePublic | undefined> {
        const result = await this.target.get(ctx, this.keyMapper.encode(key));
        if (result) {
            return this.valueMapper.decode(result);
        } else {
            return undefined;
        }
    }

    async *query(
        ctx: Context,
        condition: Condition<TKeyPublic>
    ): AsyncIterable<Entry<TKeyPublic, TValuePublic>> {
        for await (const {key, value} of this.target.query(
            ctx,
            projectCondition(condition, this.keyMapper)
        )) {
            yield {
                key: this.keyMapper.decode(key),
                value: this.valueMapper.decode(value),
            };
        }
    }

    async put(
        ctx: Context,
        key: TKeyPublic,
        value: TValuePublic
    ): Promise<void> {
        return await this.target.put(
            ctx,
            this.keyMapper.encode(key),
            this.valueMapper.encode(value)
        );
    }

    async delete(ctx: Context, key: TKeyPublic): Promise<void> {
        await this.target.delete(ctx, this.keyMapper.encode(key));
    }
}

export class MappedKVStore<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>
    implements KVStore<TKeyPublic, TValuePublic>
{
    constructor(
        private store: KVStore<TKeyPrivate, TValuePrivate>,
        private keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        private valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    transact<TResult>(
        ctx: Context,
        fn: (
            ctx: Context,
            tx: Transaction<TKeyPublic, TValuePublic>
        ) => Promise<TResult>
    ): Promise<TResult> {
        return this.store.transact(ctx, (ctx, tx) =>
            fn(ctx, new MappedTransaction(tx, this.keyMapper, this.valueMapper))
        );
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
