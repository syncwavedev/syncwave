import {rm} from 'fs/promises';
import {SqliteUint8KVStore} from './sqlite-kv-store.js';
import {describeKVStore} from './store-spec.js';

describeKVStore(
    'SqliteUint8KVStore',
    () => new SqliteUint8KVStore('./test.sqlite'),
    async () => {
        await rm('./test.sqlite');
    }
);
