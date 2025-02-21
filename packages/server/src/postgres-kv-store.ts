import pg from 'pg';
import PgCursor from 'pg-cursor';
import {
    AppError,
    BusinessError,
    type Cancel,
    CancelledError,
    type Condition,
    type Entry,
    TXN_RETRIES_COUNT,
    type Uint8KVStore,
    type Uint8Transaction,
    checkError,
    context,
    log,
    mapCondition,
    toError,
    unreachable,
    wait,
} from 'syncwave-data';

function buildConditionSql(condition: Condition<Uint8Array>): {
    clause: string;
    param: Uint8Array;
    order: string;
} {
    return mapCondition(condition, {
        gt: cond => ({
            clause: 'key > $1',
            param: cond.gt,
            order: 'ASC' as string,
        }),
        gte: cond => ({clause: 'key >= $1', param: cond.gte, order: 'ASC'}),
        lt: cond => ({clause: 'key < $1', param: cond.lt, order: 'DESC'}),
        lte: cond => ({clause: 'key <= $1', param: cond.lte, order: 'DESC'}),
    });
}

// todo: use context
class PostgresTransaction implements Uint8Transaction {
    constructor(private readonly client: pg.PoolClient) {}

    public async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        const res = await this.client.query(
            'SELECT value FROM kv_store WHERE key = $1',
            [key]
        );
        return res.rows.length > 0
            ? new Uint8Array(res.rows[0].value)
            : undefined;
    }

    public async *query(
        condition: Condition<Uint8Array>
    ): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        const {clause, param, order} = buildConditionSql(condition);
        const cursor = this.client.query(
            new PgCursor(
                `SELECT key, value FROM kv_store WHERE ${clause} ORDER BY key ${order}`,
                [param]
            )
        );

        try {
            while (true) {
                const rows = (await cursor.read(100)) as Array<{
                    key: Buffer;
                    value: Buffer;
                }>;
                if (rows.length === 0) break;

                for (const row of rows) {
                    context().ensureActive();
                    yield {
                        key: new Uint8Array(row.key),
                        value: new Uint8Array(row.value),
                    };
                }
            }
        } finally {
            await cursor.close();
        }
    }

    public async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        await this.client.query(
            'INSERT INTO kv_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, value]
        );
    }

    public async delete(key: Uint8Array): Promise<void> {
        await this.client.query('DELETE FROM kv_store WHERE key = $1', [key]);
    }
}

export class PostgresUint8KVStore implements Uint8KVStore {
    private pool: pg.Pool;
    private init: Promise<unknown>;

    constructor(config: pg.PoolConfig) {
        this.pool = new pg.Pool(config);

        // Initialize the table
        this.init = this.pool.query(`
            CREATE TABLE IF NOT EXISTS kv_store (
                key BYTEA PRIMARY KEY,
                value BYTEA
            );
        `);
    }

    async transact<TResult>(
        fn: (tx: Uint8Transaction) => Promise<TResult>
    ): Promise<TResult> {
        await this.init;
        for (let attempt = 0; attempt <= TXN_RETRIES_COUNT; attempt += 1) {
            context().ensureActive();

            const client = await this.pool.connect();
            const pidPromise = client
                .query(
                    'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE; SELECT pg_backend_pid()'
                )
                .then(res => {
                    return (res as any)[1].rows[0].pg_backend_pid as unknown;
                });

            let cancelAbort: Cancel | undefined = undefined;

            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                cancelAbort = context().onEnd(() => {
                    pidPromise
                        .then(pid =>
                            this.pool.query('SELECT pg_cancel_backend($1)', [
                                pid,
                            ])
                        )
                        .catch(error => {
                            log.error(
                                toError(error),
                                'Failed to cancel transaction'
                            );
                        });
                });

                const tx = new PostgresTransaction(client);
                const result = await fn(tx);

                await client.query('COMMIT');

                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                if (
                    // eslint-disable-next-line no-restricted-globals
                    error instanceof Error &&
                    'code' in error &&
                    error.code === '57014'
                ) {
                    throw new CancelledError('transaction cancelled', error);
                }

                if (
                    attempt === TXN_RETRIES_COUNT ||
                    error instanceof BusinessError ||
                    error instanceof CancelledError ||
                    !checkError(
                        error,
                        error =>
                            typeof error === 'object' &&
                            error !== null &&
                            'code' in error &&
                            // SerializationFailure (SQLSTATE 40001)
                            error.code === '40001'
                    )
                ) {
                    throw error;
                }
            } finally {
                client.release();
                cancelAbort?.(new AppError('transaction finished'));
            }
            await wait({
                ms: (attempt + 1) * 100 * Math.random(),
                onCancel: 'reject',
            });
        }

        unreachable();
    }

    async close(): Promise<void> {
        try {
            await this.pool.end();
        } catch (error) {
            log.error(toError(error), 'Failed to close Postgres pool');
        }
    }
}
