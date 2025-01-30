import BetterSqlite3, {Database} from 'better-sqlite3';
import {
    Condition,
    Context,
    Deferred,
    Entry,
    MemLocker,
    TXN_RETRIES_COUNT,
    Uint8KVStore,
    Uint8Transaction,
    mapCondition,
} from 'ground-data'; // adjust import as needed

function buildConditionSql(condition: Condition<Uint8Array>): {
    clause: string;
    param: Uint8Array;
    order: string;
} {
    return mapCondition(condition, {
        gt: cond => ({
            clause: 'key > ?',
            param: cond.gt,
            order: 'ASC' as string,
        }),
        gte: cond => ({clause: 'key >= ?', param: cond.gte, order: 'ASC'}),
        lt: cond => ({clause: 'key < ?', param: cond.lt, order: 'DESC'}),
        lte: cond => ({clause: 'key <= ?', param: cond.lte, order: 'DESC'}),
    });
}

interface Row {
    key: Uint8Array | Buffer;
    value: Uint8Array | Buffer;
}

// todo: use context
class SqliteTransaction implements Uint8Transaction {
    private opLock = new MemLocker<''>();

    constructor(private readonly db: Database) {}

    public async get(
        ctx: Context,
        key: Uint8Array
    ): Promise<Uint8Array | undefined> {
        return await this.opLock.lock('', async () => {
            const row = this.db
                .prepare('SELECT value FROM kv_store WHERE key = ?')
                .get(key) as Row;
            return row ? new Uint8Array(row.value) : undefined;
        });
    }

    public async *query(
        ctx: Context,
        condition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const unlockSignal = new Deferred<void>();
        try {
            await this.opLock.lock('', () => unlockSignal.promise);

            const {clause, param, order} = buildConditionSql(condition);
            const stmt = this.db.prepare(
                `SELECT key, value FROM kv_store WHERE ${clause} ORDER BY key ${order}`
            );

            for (const row of stmt.iterate(param)) {
                ctx.ensureAlive();

                yield {
                    key: new Uint8Array((row as Row).key),
                    value: new Uint8Array((row as Row).value),
                };
            }
        } finally {
            unlockSignal.resolve();
        }
    }

    public async put(
        ctx: Context,
        key: Uint8Array,
        value: Uint8Array
    ): Promise<void> {
        return await this.opLock.lock('', async () => {
            this.db
                .prepare(
                    'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)'
                )
                .run(key, value);
        });
    }

    public async delete(ctx: Context, key: Uint8Array): Promise<void> {
        await this.opLock.lock('', async () => {
            this.db.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
        });
    }
}

export class SqliteUint8KVStore implements Uint8KVStore {
    private db: Database;

    constructor(dbFilePath: string) {
        this.db = new BetterSqlite3(dbFilePath);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS kv_store (
                key   BLOB PRIMARY KEY,
                value BLOB
            );
        `);
    }

    private txLock = new MemLocker();

    async transact<TResult>(
        ctx: Context,
        fn: (ctx: Context, tx: Uint8Transaction) => Promise<TResult>
    ): Promise<TResult> {
        return await this.txLock.lock('tx', async () => {
            for (let attempt = 0; attempt <= TXN_RETRIES_COUNT; attempt += 1) {
                this.db.exec('BEGIN');

                try {
                    const tx = new SqliteTransaction(this.db);
                    const result = await fn(ctx, tx);

                    this.db.exec('COMMIT');

                    return result;
                } catch (error) {
                    this.db.exec('ROLLBACK');

                    if (attempt === TXN_RETRIES_COUNT) {
                        throw error;
                    }
                }
            }

            throw new Error('unreachable');
        });
    }

    async close(): Promise<void> {
        this.db.close();
    }
}
