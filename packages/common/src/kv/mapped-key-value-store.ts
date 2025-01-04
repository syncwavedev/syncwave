import {Condition, Entry, KVStore, Transaction} from './kv-store';

export interface Mapper<TPrivate, TPublic> {
    decode(x: TPrivate): TPublic;
    encode(x: TPublic): TPrivate;
}

export class MappedTransaction<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>
    implements Transaction<TKeyPublic, TValuePublic>
{
    constructor(
        private target: Transaction<TKeyPrivate, TValuePrivate>,
        private keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        private valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    async get(key: TKeyPublic): Promise<TValuePublic | undefined> {
        const result = await this.target.get(this.keyMapper.encode(key));
        if (result) {
            return this.valueMapper.decode(result);
        } else {
            return undefined;
        }
    }

    async *query(condition: Condition<TKeyPublic>): AsyncIterable<Entry<TKeyPublic, TValuePublic>> {
        for await (const {key, value} of this.target.query(projectCondition(condition, this.keyMapper))) {
            yield {key: this.keyMapper.decode(key), value: this.valueMapper.decode(value)};
        }
    }

    async put(key: TKeyPublic, value: TValuePublic): Promise<void> {
        return await this.target.put(this.keyMapper.encode(key), this.valueMapper.encode(value));
    }

    async delete(key: TKeyPublic): Promise<void> {
        await this.target.delete(this.keyMapper.encode(key));
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

    transaction<TResult>(fn: (txn: Transaction<TKeyPublic, TValuePublic>) => Promise<TResult>): Promise<TResult> {
        return this.store.transaction(txn => fn(new MappedTransaction(txn, this.keyMapper, this.valueMapper)));
    }
}

function projectCondition<TKeySource, TKeyTarget>(
    condition: Condition<TKeyTarget>,
    keyMapper: Mapper<TKeySource, TKeyTarget>
): Condition<TKeySource> {
    if (condition.gt) {
        return {gt: keyMapper.encode(condition.gt)};
    } else if (condition.gte) {
        return {gte: keyMapper.encode(condition.gte)};
    } else if (condition.lt) {
        return {lt: keyMapper.encode(condition.lt)};
    } else if (condition.lte) {
        return {lte: keyMapper.encode(condition.lte)};
    } else {
        throw new Error('unreachable');
    }
}
