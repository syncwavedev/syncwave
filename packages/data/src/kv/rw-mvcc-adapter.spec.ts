import {beforeEach, describe, expect, it} from 'vitest';
import {toStream} from '../stream.js';
import {whenAll} from '../utils.js';
import {KvStoreMapper} from './kv-store-mapper.js';
import type {KvStore} from './kv-store.js';
import {MvccConflictError} from './mem-mvcc-store.js';

// todo: extract KvStore testsuite (without conflicts)

import {NumberCodec, StringCodec} from '../codec.js';
import {MemRwStore} from './mem-rw-store.js';
import {describeMvccStore, TxController} from './mvcc-store-spec.js';
import {MvccAdapter, type MvccAdapterGcOptions} from './rw-mvcc-adapter.js';

describe('RwMvccAdapter', () => {
    let store: KvStore<number, string>;
    beforeEach(() => {
        store = new KvStoreMapper(
            new MvccAdapter(new MemRwStore(), {
                conflictRetryCount: 0,
                gc: {
                    everyNthCall: 2,
                    staleTransactionThresholdMs: 1000,
                    transactionThresholdVersions: 1000,
                    maxDeleteBatchSize: 1000,
                },
            }),
            new NumberCodec(),
            new StringCodec()
        );
    });

    it('should delete', async () => {
        const t1 = new TxController<number, string>();
        const t2 = new TxController<number, string>();

        await store.transact(async tx => {
            await tx.put(1, 'one');
            await tx.put(2, 'two');
            await tx.put(3, 'three');
        });

        const promise = whenAll([
            store.transact(async tx => {
                await t1.use(tx);
                await t1.waitOnCommit();
            }),
            store.transact(async tx => {
                await t2.use(tx);
                await t2.waitOnCommit();
            }),
        ]);

        await (async (t1, t2) => {
            await t1.accept();
            await t2.accept();
            await t1.put(-2, 'conflict');
            await t2.put(123, 'new');
            await toStream(t2.query({lt: -1})).firstOrDefault();

            t1.commit();
            t2.commit();
        })(t1, t2);

        await expect(promise).rejects.toThrow(MvccConflictError);
    });
});

if (true as any) {
    const gcSettings: (MvccAdapterGcOptions | false)[] = [
        false,
        {
            everyNthCall: 1,
            staleTransactionThresholdMs: 10000,
            transactionThresholdVersions: 10000,
            maxDeleteBatchSize: 1000,
        },
        {
            everyNthCall: 2,
            staleTransactionThresholdMs: 1000,
            transactionThresholdVersions: 1000,
            maxDeleteBatchSize: 1000,
        },
    ];
    for (const gc of gcSettings) {
        describeMvccStore(
            `RwMvccAdapter (case: ${JSON.stringify(gc)})`,
            options =>
                new MvccAdapter(new MemRwStore(), {
                    conflictRetryCount: options.conflictRetryCount,
                    gc: gc,
                })
        );
    }
}
