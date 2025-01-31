import {Cx} from '../context.js';
import {
    Condition,
    Entry,
    KVStore,
    mapCondition,
    Transaction,
} from './kv-store.js';

export interface Mapper<TPrivate, TPublic> {
    decode(cx: Cx, x: TPrivate): TPublic;
    encode(cx: Cx, x: TPublic): TPrivate;
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

    async get(cx: Cx, key: TKeyPublic): Promise<TValuePublic | undefined> {
        const result = await this.target.get(
            cx,
            this.keyMapper.encode(cx, key)
        );
        if (result) {
            return this.valueMapper.decode(cx, result);
        } else {
            return undefined;
        }
    }

    async *query(
        cx: Cx,
        condition: Condition<TKeyPublic>
    ): AsyncIterable<[Cx, Entry<TKeyPublic, TValuePublic>]> {
        const stream = this.target.query(
            cx,
            projectCondition(cx, condition, this.keyMapper)
        );
        for await (const [cx, {key, value}] of stream) {
            yield [
                cx,
                {
                    key: this.keyMapper.decode(cx, key),
                    value: this.valueMapper.decode(cx, value),
                },
            ];
        }
    }

    async put(cx: Cx, key: TKeyPublic, value: TValuePublic): Promise<void> {
        return await this.target.put(
            cx,
            this.keyMapper.encode(cx, key),
            this.valueMapper.encode(cx, value)
        );
    }

    async delete(cx: Cx, key: TKeyPublic): Promise<void> {
        await this.target.delete(cx, this.keyMapper.encode(cx, key));
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
        cx: Cx,
        fn: (
            cx: Cx,
            tx: Transaction<TKeyPublic, TValuePublic>
        ) => Promise<TResult>
    ): Promise<TResult> {
        return this.store.transact(cx, (cx, tx) =>
            fn(cx, new MappedTransaction(tx, this.keyMapper, this.valueMapper))
        );
    }
}

function projectCondition<TKeySource, TKeyTarget>(
    cx: Cx,
    condition: Condition<TKeyTarget>,
    keyMapper: Mapper<TKeySource, TKeyTarget>
): Condition<TKeySource> {
    return mapCondition<TKeyTarget, Condition<TKeySource>>(cx, condition, {
        gt: cond => ({gt: keyMapper.encode(cx, cond.gt)}),
        gte: cond => ({gte: keyMapper.encode(cx, cond.gte)}),
        lt: cond => ({lt: keyMapper.encode(cx, cond.lt)}),
        lte: cond => ({lte: keyMapper.encode(cx, cond.lte)}),
    });
}
