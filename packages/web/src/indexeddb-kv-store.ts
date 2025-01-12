import {type Condition, type Uint8KVStore, type Uint8Transaction} from 'ground-data';
import {openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction} from 'idb';
import type {Entry} from '../../data/dist/esm/src/kv/kv-store';

function createKeyRange(condition: Condition<Uint8Array>): IDBKeyRange {
    if (condition.gt !== undefined) {
        return IDBKeyRange.lowerBound(condition.gt, true);
    } else if (condition.gte !== undefined) {
        return IDBKeyRange.lowerBound(condition.gte, false);
    } else if (condition.lt !== undefined) {
        return IDBKeyRange.upperBound(condition.lt, true);
    } else if (condition.lte !== undefined) {
        return IDBKeyRange.upperBound(condition.lte, false);
    }
    throw new Error(`Invalid condition: ${JSON.stringify(condition)}`);
}

const STORE_NAME = 'index';

interface KVDBSchema extends DBSchema {
    [STORE_NAME]: {
        key: Uint8Array;
        value: Uint8Array;
    };
}

class IndexedDBTransaction implements Uint8Transaction {
    // markDone is called by IndexedKVStore when user function is finished
    private done = false;
    // set to false when transaction is either commits or fails
    private active = true;

    constructor(private txn: IDBPTransaction<KVDBSchema, [typeof STORE_NAME], 'readwrite'>) {
        this.txn.oncomplete = () => {
            this.active = false;
            if (!this.done) {
                throw new Error('Transaction completed (auto-commit) before user function finished');
            }
        };
        this.txn.onerror = () => {
            this.active = false;
        };
        this.txn.onabort = () => {
            this.active = false;
        };
    }

    public markDone() {
        if (!this.active) {
            throw new Error('Transaction is already completed or aborted; cannot mark done.');
        }
        this.done = true;
    }

    private assertActive() {
        if (!this.active) {
            throw new Error('Transaction is no longer active (committed/aborted).');
        }
        if (this.done) {
            throw new Error('IDB request made after transaction function has resolved.');
        }
    }

    public async get(key: Uint8Array): Promise<Uint8Array | undefined> {
        this.assertActive();
        return await this.txn.objectStore(STORE_NAME).get(key);
    }

    public async *query(condition: Condition<Uint8Array>): AsyncIterable<Entry<Uint8Array, Uint8Array>> {
        this.assertActive();
        const keyRange = createKeyRange(condition);
        yield* this.txn.objectStore(STORE_NAME).iterate(keyRange);
    }

    public async put(key: Uint8Array, value: Uint8Array): Promise<void> {
        this.assertActive();
        await this.txn.objectStore(STORE_NAME).put(value, key);
    }

    public async delete(key: Uint8Array): Promise<void> {
        this.assertActive();
        await this.txn.objectStore(STORE_NAME).delete(key);
    }
}

export class IndexedDBKVStore implements Uint8KVStore {
    private dbPromise: Promise<IDBPDatabase<KVDBSchema>>;

    constructor(dbName: string) {
        this.dbPromise = openDB<KVDBSchema>(dbName, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }

    public async transaction<TResult>(fn: (txn: Uint8Transaction) => Promise<TResult>): Promise<TResult> {
        const db = await this.dbPromise;
        const txn = db.transaction(STORE_NAME, 'readwrite');
        const enforcedTxn = new IndexedDBTransaction(txn);

        try {
            const result = await fn(enforcedTxn);
            enforcedTxn.markDone();
            txn.commit();
            await txn.done;

            return result;
        } catch (err) {
            try {
                txn.abort();
            } catch (abortErr) {
                console.error('Abort error:', abortErr);
            }
            enforcedTxn.markDone();
            throw err;
        }
    }
}
