import {PostgresUint8KvStore} from './postgres-kv-store.js';
import {describeKVStore} from './store-spec.js';

describeKVStore(
    'PostgresUint8KVStore',
    () =>
        new PostgresUint8KvStore({
            connectionString:
                'postgres://postgres:123456Qq@127.0.0.1:5440/syncwave_test',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        }),
    async store => {
        await store.transact(async tx => {
            for await (const {key} of tx.query({gte: new Uint8Array([])})) {
                await tx.delete(key);
            }
        });
    }
);
