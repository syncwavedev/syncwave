import sqlite3, {type Database} from 'sqlite3';
import {
    type Condition,
    type Entry,
    Mutex,
    TXN_RETRIES_COUNT,
    type Uint8KvStore,
    type Uint8Snapshot,
    type Uint8Transaction,
    log,
    mapCondition,
    unreachable,
    wait,
} from 'syncwave';

function isSqliteRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        return ['SQLITE_BUSY', 'SQLITE_LOCKED'].includes((error as any).code);
    }
    return false;
}

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

class SqliteTransaction implements Uint8Transaction {
    constructor(private readonly db: Database) {}

    get(key: Uint8Array): Promise<Uint8Array | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT value FROM kv_store WHERE key = ?',
                key,
                (err, row: Row) => {
                    if (err) return reject(err);
                    resolve(row ? new Uint8Array(row.value) : undefined);
                }
            );
        });
    }

    async *query(
        condition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const {clause, param, order} = buildConditionSql(condition);
        const sql = `SELECT key, value FROM kv_store WHERE ${clause} ORDER BY key ${order}`;

        const rows: Row[] = await new Promise((resolve, reject) => {
            this.db.all(sql, param, (err, rows) => {
                if (err) return reject(err);
                resolve(rows as Row[]);
            });
        });

        for (const row of rows) {
            yield {
                key: new Uint8Array(row.key),
                value: new Uint8Array(row.value),
            };
        }
    }

    put(key: Uint8Array, value: Uint8Array): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
                [key, value],
                (err: Error | null) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
    }

    delete(key: Uint8Array): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM kv_store WHERE key = ?',
                key,
                (err: Error | null) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
    }
}

export interface SqliteRwStoreOptions {
    dbFilePath: string;
}

export class SqliteRwStore implements Uint8KvStore {
    private db: Database;
    private mutex = new Mutex();

    private constructor(db: Database) {
        this.db = db;
    }

    public static async create(
        options: SqliteRwStoreOptions
    ): Promise<SqliteRwStore> {
        const db: Database = await new Promise((resolve, reject) => {
            const database = new sqlite3.Database(options.dbFilePath, err => {
                if (err) return reject(err);
                resolve(database);
            });
        });

        const store = new SqliteRwStore(db);
        await store.initialize();
        return store;
    }

    private async initialize(): Promise<void> {
        await this.exec(`
            CREATE TABLE IF NOT EXISTS kv_store (
                key   BLOB PRIMARY KEY,
                value BLOB
            );
        `);

        const row = await this.getPragma('cache_size');
        log.info({msg: `SQLite cache size: ${row.cache_size}`});
    }

    // Promisified wrapper for db.exec
    private exec(sql: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, err => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    // Promisified wrapper for getting a pragma value
    private getPragma(name: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(`PRAGMA ${name};`, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }

    async snapshot<R>(fn: (snap: Uint8Snapshot) => Promise<R>): Promise<R> {
        return this.mutex.run(() => this._transact(fn, true));
    }

    async transact<R>(fn: (tx: Uint8Transaction) => Promise<R>): Promise<R> {
        return this.mutex.run(() => this._transact(fn, false));
    }

    private async _transact<R>(
        fn: (txn: Uint8Transaction) => Promise<R>,
        readOnly: boolean
    ): Promise<R> {
        for (let attempt = 0; attempt <= TXN_RETRIES_COUNT; attempt += 1) {
            // Use DEFERRED for read-only snapshots, IMMEDIATE for write transactions
            const beginCommand = readOnly
                ? 'BEGIN DEFERRED'
                : 'BEGIN IMMEDIATE';
            await this.exec(beginCommand);

            try {
                const txn = new SqliteTransaction(this.db);
                const result = await fn(txn);
                await this.exec('COMMIT');
                return result;
            } catch (error) {
                await this.exec('ROLLBACK');

                if (attempt === TXN_RETRIES_COUNT) {
                    throw error;
                }

                // Retry only on specific, recoverable SQLite errors
                if (isSqliteRetryableError(error)) {
                    log.warn({
                        msg: 'SQLite transaction failed, retrying...',
                        attempt,
                    });

                    await wait({
                        ms: 16 * Math.random() * attempt,
                        onCancel: 'reject',
                    });
                } else {
                    throw error;
                }
            }
        }

        unreachable();
    }

    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close(err => {
                if (err) return reject(err);
                resolve();
            });
        });
    }
}
