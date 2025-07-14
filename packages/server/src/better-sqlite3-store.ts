import BetterSqlite3, {type Database, SqliteError} from 'better-sqlite3';
import {
    type Condition,
    type Entry,
    KV_STORE_QUERY_BATCH_SIZE,
    Mutex,
    TXN_RETRIES_COUNT,
    type Uint8KvStore,
    type Uint8Snapshot,
    type Uint8Transaction,
    assert,
    log,
    mapCondition,
    unreachable,
} from 'syncwave';

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

class BetterSqlite3Transaction implements Uint8Transaction {
    keysRead = 0;
    keysReturned = 0;

    get base() {
        return undefined;
    }

    constructor(private readonly db: Database) {}

    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        this.keysRead += 1;
        this.keysReturned += 1;
        const row = this.db
            .prepare('SELECT value FROM kv_store WHERE key = ?')
            .get(key) as Row;
        return row ? new Uint8Array(row.value) : undefined;
    }

    async *query(
        inputCondition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        let condition = inputCondition;

        while (true) {
            const {clause, param, order} = buildConditionSql(condition);
            const rows = this.db
                .prepare(
                    `SELECT key, value FROM kv_store WHERE ${clause} ORDER BY key ${order} LIMIT ${KV_STORE_QUERY_BATCH_SIZE}`
                )
                .all(param) as Row[];

            this.keysRead += rows.length;

            for (const row of rows) {
                this.keysReturned += 1;
                yield {
                    key: new Uint8Array((row as Row).key),
                    value: new Uint8Array((row as Row).value),
                };
            }

            if (rows.length < KV_STORE_QUERY_BATCH_SIZE) {
                return;
            }

            const lastKey = rows.at(-1)?.key;
            assert(lastKey !== undefined, 'lastKey is undefined');
            if (condition.gt || condition.gte) {
                condition = {gt: new Uint8Array(lastKey)};
            } else {
                condition = {lt: new Uint8Array(lastKey)};
            }
        }
    }

    async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        this.db
            .prepare(
                'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)'
            )
            .run(key, value);
    }

    async delete(key: Uint8Array): Promise<void> {
        this.db.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
    }
}

export interface BetterSqlite3RwStoreOptions {
    dbFilePath: string;
    concurrentReadLimit: number;
}

export class BetterSqlite3RwStore implements Uint8KvStore {
    private db: Database;
    private mutex = new Mutex();

    constructor(options: BetterSqlite3RwStoreOptions) {
        this.db = new BetterSqlite3(options.dbFilePath, {});

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS kv_store (
                key   BLOB PRIMARY KEY,
                value BLOB
            );
        `);

        this.db.exec('PRAGMA journal_mode=DELETE;');
        this.db.exec(`PRAGMA cache_size = -131072;`); // 128 MB
        this.db.exec(`PRAGMA mmap_size = 0;`);

        const cacheSize = (this.db.pragma('cache_size') as any)[0].cache_size;
        log.info({msg: `SQLite cache size: ${cacheSize}`});
    }

    async snapshot<R>(fn: (snap: Uint8Snapshot) => Promise<R>): Promise<R> {
        return await this.mutex.run(async () => {
            return await this._transact(fn);
        });
    }

    async transact<R>(fn: (tx: Uint8Transaction) => Promise<R>): Promise<R> {
        return await this.mutex.run(async () => {
            return await this._transact(fn);
        });
    }

    private async _transact<R>(
        fn: (txn: Uint8Transaction) => Promise<R>
    ): Promise<R> {
        for (let attempt = 0; attempt <= TXN_RETRIES_COUNT; attempt += 1) {
            this.db.exec('BEGIN IMMEDIATE');

            try {
                const txn = new BetterSqlite3Transaction(this.db);
                const result = await fn(txn);

                this.db.exec('COMMIT');

                return result;
            } catch (error) {
                this.db.exec('ROLLBACK');

                if (attempt === TXN_RETRIES_COUNT) {
                    throw error;
                }

                if (error instanceof SqliteError) {
                    // Retry on Sqlite error
                } else {
                    throw error;
                }
            }
        }

        unreachable();
    }

    close(): void {
        this.db.close();
    }
}
