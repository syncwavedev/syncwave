import {Condition, Crud, Cursor, CursorNext, KeyValueStore, Transaction} from './contracts/key-value-store';
import {Result} from './result';
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

    get(key: TKeyPublic): Promise<Result<unknown, TValuePublic>> {
        return mapGet(this.transaction, this.keyMapper, this.valueMapper, key);
    }

    query(condition: Condition<TKeyPublic>): Promise<Result<unknown, Cursor<TKeyPublic, TValuePublic>>> {
        return mapQuery(this.transaction, this.keyMapper, this.valueMapper, condition);
    }

    put(key: TKeyPublic, value: TValuePublic): Promise<Result<unknown, void>> {
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

    next(): Promise<Result<unknown, CursorNext<TKeyPublic, TValuePublic>>> {
        return this.cursor.next().then(result =>
            result.map((nextResult): CursorNext<TKeyPublic, TValuePublic> => {
                if (nextResult.type === 'done') {
                    return nextResult;
                } else if (nextResult.type === 'record') {
                    return {
                        type: 'record',
                        key: this.keyMapper.decode(nextResult.key),
                        value: this.valueMapper.decode(nextResult.value),
                    };
                } else {
                    assertNever(nextResult);
                }
            })
        );
    }

    close(): Promise<Result<unknown, void>> {
        return this.cursor.close();
    }
}

export class MappedKeyValueStore<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>
    implements KeyValueStore<TKeyPublic, TValuePublic>
{
    constructor(
        private store: KeyValueStore<TKeyPrivate, TValuePrivate>,
        private keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
        private valueMapper: Mapper<TValuePrivate, TValuePublic>
    ) {}

    transaction<TResult>(
        fn: (txn: Transaction<TKeyPublic, TValuePublic>) => Promise<Result<unknown, TResult>>
    ): Promise<Result<unknown, TResult>> {
        return this.store.transaction(txn => fn(new MappedTransaction(txn, this.keyMapper, this.valueMapper)));
    }

    get(key: TKeyPublic): Promise<Result<unknown, TValuePublic>> {
        return mapGet(this.store, this.keyMapper, this.valueMapper, key);
    }

    query(condition: Condition<TKeyPublic>): Promise<Result<unknown, Cursor<TKeyPublic, TValuePublic>>> {
        return mapQuery(this.store, this.keyMapper, this.valueMapper, condition);
    }

    put(key: TKeyPublic, value: TValuePublic): Promise<Result<unknown, void>> {
        return mapPut(this.store, this.keyMapper, this.valueMapper, key, value);
    }
}

function mapGet<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>(
    crud: Crud<TKeyPrivate, TValuePrivate>,
    keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
    valueMapper: Mapper<TValuePrivate, TValuePublic>,
    key: TKeyPublic
): Promise<Result<unknown, TValuePublic>> {
    return crud.get(keyMapper.encode(key)).then(result => result.map(value => valueMapper.decode(value)));
}

function mapPut<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>(
    crud: Crud<TKeyPrivate, TValuePrivate>,
    keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
    valueMapper: Mapper<TValuePrivate, TValuePublic>,
    key: TKeyPublic,
    value: TValuePublic
): Promise<Result<unknown, void>> {
    return crud.put(keyMapper.encode(key), valueMapper.encode(value));
}

function mapQuery<TKeyPrivate, TKeyPublic, TValuePrivate, TValuePublic>(
    crud: Crud<TKeyPrivate, TValuePrivate>,
    keyMapper: Mapper<TKeyPrivate, TKeyPublic>,
    valueMapper: Mapper<TValuePrivate, TValuePublic>,
    condition: Condition<TKeyPublic>
): Promise<Result<unknown, Cursor<TKeyPublic, TValuePublic>>> {
    return crud
        .query(projectCondition(condition, keyMapper))
        .then(result => result.map(cursor => new MappedCursor(cursor, keyMapper, valueMapper)));
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
