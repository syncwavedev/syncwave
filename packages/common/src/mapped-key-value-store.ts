import {Condition, Crud, Cursor, CursorNext, KVStore, Transaction} from './contracts/key-value-store';
import {assertNever} from './utils';

export interface Mapper<TPrivate, TPublic> {
    decode(x: TPrivate): TPublic;
    encode(x: TPublic): TPrivate;
}

export class MappedTransaction<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>
    implements Transaction<TKeyPublic, TValuePublic>
{
    constructor(
        private transaction: Transaction<TKeyPrivate, TValuePrivate>,
        private keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        private valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    get(key: TKeyPublic): Promise<TValuePublic | undefined> {
        return mapGet(this.transaction, this.keyMapper, this.valueMapper, key);
    }

    query(condition: Condition<TKeyPublic>): Promise<Cursor<TKeyPublic, TValuePublic>> {
        return mapQuery(this.transaction, this.keyMapper, this.valueMapper, condition);
    }

    put(key: TKeyPublic, value: TValuePublic): Promise<void> {
        return mapPut(this.transaction, this.keyMapper, this.valueMapper, key, value);
    }
}

export class MappedCursor<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>
    implements Cursor<TKeyPublic, TValuePublic>
{
    constructor(
        private cursor: Cursor<TKeyPrivate, TValuePrivate>,
        private keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        private valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    async next(): Promise<CursorNext<TKeyPublic, TValuePublic>> {
        const next = await this.cursor.next();

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
        return this.cursor.close();
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

    get(key: TKeyPublic): Promise<TValuePublic | undefined> {
        return mapGet(this.store, this.keyMapper, this.valueMapper, key);
    }

    query(condition: Condition<TKeyPublic>): Promise<Cursor<TKeyPublic, TValuePublic>> {
        return mapQuery(this.store, this.keyMapper, this.valueMapper, condition);
    }

    put(key: TKeyPublic, value: TValuePublic): Promise<void> {
        return mapPut(this.store, this.keyMapper, this.valueMapper, key, value);
    }
}

async function mapGet<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>(
    crud: Crud<TKeyPrivate, TValuePrivate>,
    keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
    valueMapper: Mapper<TValuePrivate, TValuePublic>,
    key: TKeyPublic
): Promise<TValuePublic | undefined> {
    const result = await crud.get(keyMapper.encode(key));
    if (result) {
        return valueMapper.decode(result);
    } else {
        return undefined;
    }
}

async function mapPut<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>(
    crud: Crud<TKeyPrivate, TValuePrivate>,
    keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
    valueMapper: Mapper<TValuePrivate, TValuePublic>,
    key: TKeyPublic,
    value: TValuePublic
): Promise<void> {
    await crud.put(keyMapper.encode(key), valueMapper.encode(value));
}

async function mapQuery<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>(
    crud: Crud<TKeyPrivate, TValuePrivate>,
    keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
    valueMapper: Mapper<TValuePrivate, TValuePublic>,
    condition: Condition<TKeyPublic>
): Promise<Cursor<TKeyPublic, TValuePublic>> {
    const cursor = await crud.query(projectCondition(condition, keyMapper));
    return new MappedCursor(cursor, keyMapper, valueMapper);
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
