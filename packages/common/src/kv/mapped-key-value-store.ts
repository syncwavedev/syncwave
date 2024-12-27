import {assertNever} from '../utils';
import {Condition, Cursor, CursorNext, KVStore, Transaction} from './key-value-store';

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

    async query(condition: Condition<TKeyPublic>): Promise<Cursor<TKeyPublic, TValuePublic>> {
        const cursor = await this.target.query(projectCondition(condition, this.keyMapper));
        return new MappedCursor(cursor, this.keyMapper, this.valueMapper);
    }

    async put(key: TKeyPublic, value: TValuePublic): Promise<void> {
        return await this.target.put(this.keyMapper.encode(key), this.valueMapper.encode(value));
    }
}

export class MappedCursor<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>
    implements Cursor<TKeyPublic, TValuePublic>
{
    constructor(
        private target: Cursor<TKeyPrivate, TValuePrivate>,
        private keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        private valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    async next(): Promise<CursorNext<TKeyPublic, TValuePublic>> {
        const next = await this.target.next();

        if (next.type === 'done') {
            return next;
        } else if (next.type === 'entry') {
            return {
                type: 'entry',
                key: this.keyMapper.decode(next.key),
                value: this.valueMapper.decode(next.value),
            };
        } else {
            assertNever(next);
        }
    }

    close(): Promise<void> {
        return this.target.close();
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
