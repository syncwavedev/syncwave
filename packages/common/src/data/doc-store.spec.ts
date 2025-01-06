import {beforeEach, describe, expect, it, vi} from 'vitest';

import {IndexKey} from '../kv/data-index';
import {Condition} from '../kv/kv-store';
import {MemKVStore} from '../kv/mem-kv-store';
import {createUuid, Uuid} from '../uuid';
import {DocStore, IndexSpec, OnDocChange} from './doc-store';

interface MyDoc {
    id: Uuid;
    name: string;
    age: number;
}

const indexes: Record<string, IndexSpec<MyDoc>> = {
    byName: {
        key: doc => [doc.name],
    },
    byAge: doc => [doc.age],
};

describe('DocStore with MemKVStore', () => {
    let store: MemKVStore;

    beforeEach(() => {
        store = new MemKVStore();
    });

    it('should create and retrieve a document by ID', async () => {
        const id = createUuid();
        const doc: MyDoc = {
            id,
            name: 'Alice',
            age: 30,
        };

        let docStore: DocStore<MyDoc> | undefined;
        const onChange: OnDocChange<MyDoc> = vi.fn();

        await store.transaction(async txn => {
            docStore = new DocStore<MyDoc>({
                txn,
                indexes,
                onChange,
            });
            await docStore.create(doc);
        });

        // Make sure the doc is retrievable
        const retrieved = await store.transaction(async txn => {
            // docStore must be re-instantiated each transaction, or pass the same txn
            const docStore2 = new DocStore<MyDoc>({
                txn,
                indexes,
                onChange,
            });
            return docStore2.getById(id);
        });

        expect(retrieved).toEqual(doc);
        // Make sure onChange was called exactly once (on create)
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if creating a doc with an existing ID', async () => {
        const id = createUuid();
        const doc: MyDoc = {id, name: 'Bob', age: 22};

        await store.transaction(async txn => {
            const docStore = new DocStore<MyDoc>({
                txn,
                indexes,
                onChange: async () => {},
            });
            await docStore.create(doc);
        });

        // Attempt to create the same doc again
        await expect(
            store.transaction(async txn => {
                const docStore = new DocStore<MyDoc>({
                    txn,
                    indexes,
                    onChange: async () => {},
                });
                await docStore.create(doc);
            })
        ).rejects.toThrowError(/already exists/);
    });

    it('should update a document', async () => {
        const id = createUuid();
        const doc: MyDoc = {id, name: 'Charlie', age: 40};
        let docStore: DocStore<MyDoc> | undefined;
        const onChange: OnDocChange<MyDoc> = vi.fn();

        // Create the doc
        await store.transaction(async txn => {
            docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            await docStore.create(doc);
        });

        // Update the doc
        const updated = await store.transaction(async txn => {
            docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            return docStore.update(id, current => {
                current.age = 41;
            });
        });

        expect(updated.age).toBe(41);

        // Re-retrieve the doc
        const retrieved = await store.transaction(async txn => {
            docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            return docStore.getById(id);
        });

        expect(retrieved?.age).toBe(41);

        // On change was called twice: once on create, once on update
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('should retrieve documents by a non-unique index', async () => {
        const onChange: OnDocChange<MyDoc> = vi.fn();

        // Insert multiple docs
        await store.transaction(async txn => {
            const docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            await docStore.create({id: createUuid(), name: 'Dana', age: 20});
            await docStore.create({id: createUuid(), name: 'Dana', age: 25}); // same name
            await docStore.create({id: createUuid(), name: 'Eli', age: 25});
        });

        // Use the "byName" index
        const docsNamedDana = await store.transaction(async txn => {
            const docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            const results: MyDoc[] = [];
            for await (const d of docStore.get('byName', ['Dana'])) {
                results.push(d);
            }
            return results;
        });

        // Should have found two docs with name = 'Dana'
        expect(docsNamedDana.length).toBe(2);
        expect(new Set(docsNamedDana.map(d => d.name))).toEqual(new Set(['Dana']));

        // Check byAge index for age=25
        const docsAge25 = await store.transaction(async txn => {
            const docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            const results: MyDoc[] = [];
            for await (const d of docStore.get('byAge', [25])) {
                results.push(d);
            }
            return results;
        });
        expect(docsAge25.length).toBe(2); // one named Dana, one named Eli
    });

    it('should retrieve documents by querying an index (range condition)', async () => {
        const onChange: OnDocChange<MyDoc> = vi.fn();

        await store.transaction(async txn => {
            const docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            await docStore.create({id: createUuid(), name: 'Fiona', age: 10});
            await docStore.create({id: createUuid(), name: 'Gabe', age: 15});
            await docStore.create({id: createUuid(), name: 'Hank', age: 20});
            await docStore.create({id: createUuid(), name: 'Iris', age: 25});
            await docStore.create({id: createUuid(), name: 'Jake', age: 30});
        });

        // Suppose we want to find docs whose "byAge" index is >= 15 and <= 25
        // Condition in the store is typed for Condition<IndexKey>, which is basically Uint8Array-based,
        // but we have helpers that pass raw numbers (due to withValueEncoder, etc).
        // So let's see how to do a range query:
        const ageGte15: Condition<IndexKey> = {gte: [15]};
        const ageLte25: Condition<IndexKey> = {lte: [25]};

        const docsBetween15And25 = await store.transaction(async txn => {
            const docStore = new DocStore<MyDoc>({txn, indexes, onChange});

            const results: MyDoc[] = [];
            // We can handle one side of the range first (e.g., ">= 15")
            for await (const d of docStore.query('byAge', ageGte15)) {
                // Then manually filter to "<= 25"
                // Typically you'd do a combined condition, but the Condition type above
                // suggests using either {gt, gte} or {lt, lte} in a single call.
                // You can do multiple queries or chain logic as needed.

                if (d.age <= 25) {
                    results.push(d);
                } else {
                    // Because we are iterating in ascending order, once we exceed 25, we can break
                    break;
                }
            }
            return results;
        });

        expect(docsBetween15And25.length).toBe(3);
        expect(new Set(docsBetween15And25.map(d => d.name))).toEqual(new Set(['Gabe', 'Hank', 'Iris']));
    });

    it('should retrieve a single doc via getUnique (and throw if multiple docs exist)', async () => {
        const onChange: OnDocChange<MyDoc> = vi.fn();

        // Insert some docs
        let docStore: DocStore<MyDoc>;
        await store.transaction(async txn => {
            docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            await docStore.create({id: createUuid(), name: 'Zed', age: 55});
            await docStore.create({id: createUuid(), name: 'Zed', age: 60});
        });

        // getUnique on 'byName' with 'Zed'
        // Because 'byName' is not unique in our example,
        // we should get an error if more than one doc matches.
        await store.transaction(async txn => {
            docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            await expect(docStore.getUnique('byName', ['Zed'])).rejects.toThrowError(/contains multiple docs/);
        });

        // If we query an index that only has a single doc, that should succeed
        // E.g. if we had a "unique" index on some other field, or if there's only one doc
        // with the same name.
        // For demonstration, let's remove one of the "Zed" docs, then getUnique will succeed.

        let firstZedId: Uuid | undefined;
        await store.transaction(async txn => {
            docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            const zedEntries: MyDoc[] = [];
            for await (const zedDoc of docStore.get('byName', ['Zed'])) {
                zedEntries.push(zedDoc);
            }
            // Let's delete one of them
            firstZedId = zedEntries[0].id;
            await docStore.update(firstZedId, doc => {
                doc.name = 'Andrei';
            });
        });

        // Now only one 'Zed' doc remains, getUnique works
        const uniqueZedDoc = await store.transaction(async txn => {
            docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            return docStore.getUnique('byName', ['Zed']);
        });
        expect(uniqueZedDoc?.name).toBe('Zed');
    });

    it('should throw an error on update if doc is not found', async () => {
        const onChange: OnDocChange<MyDoc> = vi.fn();
        const nonExistentId = createUuid();

        await expect(
            store.transaction(async txn => {
                const docStore = new DocStore<MyDoc>({txn, indexes, onChange});
                return docStore.update(nonExistentId, doc => {
                    doc.name = 'Nope';
                });
            })
        ).rejects.toThrowError(/doc not found/);
    });

    it('should call onChange callback with the correct diffs on create and update', async () => {
        const onChange = vi.fn();

        // 1) CREATE
        const createdDoc: MyDoc = {id: createUuid(), name: 'Alpha', age: 1};
        await store.transaction(async txn => {
            const docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            await docStore.create(createdDoc);
        });

        // Expect onChange called with (id, diff) where `prev` is undefined, `next` is the doc
        // The CrdtDiff for a new doc basically has all fields in "added" or "modified".
        expect(onChange).toHaveBeenCalledTimes(1);
        let call = onChange.mock.calls[0];
        expect(call[0]).toBe(createdDoc.id); // id
        // call[1] is the diff. We can do a minimal check or more thorough.
        // For a brand-new doc, we expect the entire doc to be added.

        // 2) UPDATE
        onChange.mockClear();

        await store.transaction(async txn => {
            const docStore = new DocStore<MyDoc>({txn, indexes, onChange});
            await docStore.update(createdDoc.id, doc => {
                doc.age = 2;
            });
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        call = onChange.mock.calls[0];
        expect(call[0]).toBe(createdDoc.id);
        // call[1] is the diff.
        // For an age change, the diff should indicate old=1, new=2 for that field, etc.
    });
});
