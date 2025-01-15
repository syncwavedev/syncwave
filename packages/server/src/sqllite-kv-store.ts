import BetterSqlite3, {Database} from 'better-sqlite3';
import {Condition, Entry, TXN_RETRIES_COUNT, Uint8KVStore, Uint8Transaction, mapCondition} from 'ground-data'; // adjust import as needed

function buildConditionSql(condition: Condition<Uint8Array>): {clause: string; param: Uint8Array} {
    return mapCondition(condition, {
        gt: cond => ({clause: 'key > ?', param: cond.gt}),
        gte: cond => ({clause: 'key >= ?', param: cond.gte}),
        lt: cond => ({clause: 'key < ?', param: cond.lt}),
        lte: cond => ({clause: 'key <= ?', param: cond.lte}),
    });
}

interface Row {
    key: Uint8Array;
    value: Uint8Array;
}

class SqliteTransaction implements Uint8Transaction {
    constructor(private readonly db: Database) {}

    public async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        const row = this.db.prepare('SELECT value FROM kvstore WHERE key = ?').get(key) as Row;
        return row ? row.value : undefined;
    }

    public async *query(condition: Condition<Uint8Array>): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const {clause, param} = buildConditionSql(condition);
        const stmt = this.db.prepare(`SELECT key, value FROM kvstore WHERE ${clause} ORDER BY key ASC`);

        for (const row of stmt.iterate(param)) {
            yield {key: (row as Row).key, value: (row as Row).value};
        }
    }

    public async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        this.db.prepare('INSERT OR REPLACE INTO kvstore (key, value) VALUES (?, ?)').run(key, value);
    }

    public async delete(key: Uint8Array): Promise<void> {
        this.db.prepare('DELETE FROM kvstore WHERE key = ?').run(key);
    }
}

export class SqliteUint8KVStore implements Uint8KVStore {
    private db: Database;

    constructor(dbFilePath: string) {
        this.db = new BetterSqlite3(dbFilePath);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS kvstore (
                key   BLOB PRIMARY KEY,
                value BLOB
            );
        `);
    }

    public async transaction<TResult>(fn: (txn: Uint8Transaction) => Promise<TResult>): Promise<TResult> {
        for (let attempt = 0; attempt <= TXN_RETRIES_COUNT; attempt += 1) {
            this.db.exec('BEGIN');
            let result: TResult;

            try {
                const txn = new SqliteTransaction(this.db);
                result = await fn(txn);

                this.db.exec('COMMIT');
            } catch (error) {
                this.db.exec('ROLLBACK');
                throw error;
            }

            return result;
        }

        throw new Error('maximum number of attempts reached for transaction');
    }

    public async close(): Promise<void> {
        this.db.close();
    }
}
