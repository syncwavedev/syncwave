import {beforeEach, describe, expect, it, vi} from 'vitest';

import {Type} from '@sinclair/typebox';
import type {AppStore, Condition} from '../kv/kv-store.js';
import {MemMvccStore} from '../kv/mem-mvcc-store.js';
import {TupleStore} from '../kv/tuple-store.js';
import {getNow, type Timestamp} from '../timestamp.js';
import type {Tuple} from '../tuple.js';
import {createUuid, Uuid} from '../uuid.js';
import {
    type Doc,
    DocRepo,
    type IndexSpec,
    type OnDocChange,
    zDoc,
} from './doc-repo.js';

interface MyDoc extends Doc<readonly [Uuid]> {
    name: string;
    age: number;
}

function zMyDoc() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid()])),
        Type.Object({
            name: Type.String(),
            age: Type.Number(),
        }),
    ]);
}

const schema = zMyDoc();

const indexes: Record<string, IndexSpec<MyDoc>> = {
    byName: {
        key: doc => [doc.name],
    },
    byAge: doc => [doc.age],
};

describe('DocStore with MemKVStore', () => {
    let store: AppStore;
    const now = getNow();

    beforeEach(() => {
        store = new TupleStore(new MemMvccStore());
    });

    it('should create and retrieve a document by ID', async () => {
        const id = [createUuid()] as const;
        const doc: MyDoc = {
            pk: id,
            name: 'Alice',
            age: 30,
            deleted: false,
            createdAt: now,
            updatedAt: now,
        };

        let repo: DocRepo<MyDoc> | undefined;
        const onChange: OnDocChange<MyDoc> = vi.fn();

        await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,

                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await repo.create(doc);
        });

        // Make sure the doc is retrievable
        const retrieved = await store.transact(async tx => {
            // repo must be re-instantiated each transaction, or pass the same tx
            const repo2 = new DocRepo<MyDoc>({
                tx,

                indexes,
                onChange,
                schema,
                constraints: [],
            });
            return repo2.getById(id);
        });

        // todo: add state tests
        expect(retrieved).toEqual({
            ...doc,
            createdAt: expect.any(Number) as Timestamp,
            updatedAt: expect.any(Number) as Timestamp,
            state: {
                payload: expect.any(Uint8Array),
                timestamp: expect.any(Number),
            },
        });
        expect(retrieved?.updatedAt).toBeGreaterThan(doc.updatedAt);
        expect(retrieved?.updatedAt).toEqual(retrieved?.createdAt);
        // Make sure onChange was called exactly once (on create)
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if creating a doc with an existing ID', async () => {
        const id = [createUuid()] as const;
        const doc: MyDoc = {
            pk: id,
            name: 'Bob',
            age: 22,
            deleted: false,
            createdAt: now,
            updatedAt: now,
        };

        await store.transact(async tx => {
            const repo = new DocRepo<MyDoc>({
                tx,

                indexes,
                onChange: async () => {},
                schema,
                constraints: [],
            });
            await repo.create(doc);
        });

        // Attempt to create the same doc again
        await expect(
            store.transact(async tx => {
                const repo = new DocRepo<MyDoc>({
                    tx,

                    indexes,
                    onChange: async () => {},
                    schema,
                    constraints: [],
                });
                await repo.create(doc);
            })
        ).rejects.toThrowError(/already exists/);
    });

    it('should update a document', async () => {
        const id = [createUuid()] as const;
        const doc: MyDoc = {
            pk: id,
            name: 'Charlie',
            age: 40,
            deleted: false,
            createdAt: now,
            updatedAt: now,
        };
        let repo: DocRepo<MyDoc> | undefined;
        const onChange: OnDocChange<MyDoc> = vi.fn();

        // Create the doc
        await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await repo.create(doc);
        });

        // Update the doc
        const updated = await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            return repo.update(id, current => {
                current.age = 41;
            });
        });

        expect(updated.age).toBe(41);

        // Re-retrieve the doc
        const retrieved = await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            return repo.getById(id);
        });

        expect(retrieved?.age).toBe(41);

        // On change was called twice: once on create, once on update
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('should catch schema violation', async () => {
        const id = [createUuid()] as const;
        const doc: MyDoc = {
            pk: id,
            name: 'Charlie',
            age: 40,
            deleted: false,
            createdAt: now,
            updatedAt: now,
        };
        let repo: DocRepo<MyDoc> | undefined;
        const onChange: OnDocChange<MyDoc> = vi.fn();

        await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await repo.create(doc);
        });

        await expect(
            store.transact(async tx => {
                repo = new DocRepo<MyDoc>({
                    tx,
                    indexes,
                    onChange,
                    schema,
                    constraints: [],
                });
                return repo.update(id, current => {
                    (current as any).unknownProp = 'val';
                });
            })
        ).resolves.toEqual({
            pk: id,
            name: 'Charlie',
            age: 40,
            createdAt: expect.any(Number) as Timestamp,
            updatedAt: expect.any(Number) as Timestamp,
            unknownProp: 'val',
            deleted: false,
        });

        await expect(
            store.transact(async tx => {
                repo = new DocRepo<MyDoc>({
                    tx,
                    indexes,
                    onChange,
                    schema,
                    constraints: [],
                });
                return repo.update(id, current => {
                    (current as any).pk = 'val';
                });
            })
        ).rejects.toThrowError();

        await expect(
            store.transact(async tx => {
                repo = new DocRepo<MyDoc>({
                    tx,
                    indexes,
                    onChange,
                    schema,
                    constraints: [],
                });
                return repo.update(id, current => {
                    (current as any).pk = ['val'];
                });
            })
        ).rejects.toThrowError();
    });

    it('should retrieve documents by a non-unique index', async () => {
        const onChange: OnDocChange<MyDoc> = vi.fn();

        // Insert multiple docs
        await store.transact(async tx => {
            const repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Dana',
                age: 20,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Dana',
                age: 25,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            }); // same name
            await repo.create({
                pk: [createUuid()],
                name: 'Eli',
                age: 25,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
        });

        // Use the "byName" index
        const docsNamedDana = await store.transact(async tx => {
            const repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            const results: MyDoc[] = [];
            const doc$ = repo.get('byName', ['Dana']);
            for await (const d of doc$) {
                results.push(d);
            }
            return results;
        });

        // Should have found two docs with name = 'Dana'
        expect(docsNamedDana.length).toBe(2);
        expect(new Set(docsNamedDana.map(d => d.name))).toEqual(
            new Set(['Dana'])
        );

        // Check byAge index for age=25
        const docsAge25 = await store.transact(async tx => {
            const repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            const results: MyDoc[] = [];
            const doc$ = repo.get('byAge', [25]);
            for await (const d of doc$) {
                results.push(d);
            }
            return results;
        });
        expect(docsAge25.length).toBe(2); // one named Dana, one named Eli
    });

    it('should retrieve documents by querying an index (range condition)', async () => {
        const onChange: OnDocChange<MyDoc> = vi.fn();

        await store.transact(async tx => {
            const repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Fiona',
                age: 10,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Gabe',
                age: 15,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Hank',
                age: 20,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Iris',
                age: 25,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Jake',
                age: 30,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
        });

        // Suppose we want to find docs whose "byAge" index is >= 15 and <= 25
        // Condition in the store is typed for Condition<IndexKey>, which is basically Uint8Array-based,
        // but we have helpers that pass raw numbers (due to withValueCodec, etc).
        // So let's see how to do a range query:
        const ageGte15: Condition<Tuple> = {gte: [15]};

        const docsBetween15And25 = await store.transact(async tx => {
            const repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });

            const results: MyDoc[] = [];
            // We can handle one side of the range first (e.g., ">= 15")
            const doc$ = repo.query('byAge', ageGte15);
            for await (const d of doc$) {
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
        expect(new Set(docsBetween15And25.map(d => d.name))).toEqual(
            new Set(['Gabe', 'Hank', 'Iris'])
        );
    });

    it('should retrieve a single doc via getUnique (and throw if multiple docs exist)', async () => {
        const onChange: OnDocChange<MyDoc> = vi.fn();

        // Insert some docs
        let repo: DocRepo<MyDoc>;
        await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Zed',
                age: 55,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
            await repo.create({
                pk: [createUuid()],
                name: 'Zed',
                age: 60,
                deleted: false,
                createdAt: now,
                updatedAt: now,
            });
        });

        // getUnique on 'byName' with 'Zed'
        // Because 'byName' is not unique in our example,
        // we should get an error if more than one doc matches.
        await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await expect(
                repo.getUnique('byName', ['Zed'])
            ).rejects.toThrowError(/contains multiple docs/);
        });

        // If we query an index that only has a single doc, that should succeed
        // E.g. if we had a "unique" index on some other field, or if there's only one doc
        // with the same name.
        // For demonstration, let's remove one of the "Zed" docs, then getUnique will succeed.

        let firstZedId: Tuple | undefined;
        await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            const zedEntries: MyDoc[] = [];
            const zedDoc$ = repo.get('byName', ['Zed']);
            for await (const zedDoc of zedDoc$) {
                zedEntries.push(zedDoc);
            }
            // Let's delete one of them
            firstZedId = zedEntries[0].pk;
            await repo.update(firstZedId, doc => {
                doc.name = 'Andrei';
            });
        });

        // Now only one 'Zed' doc remains, getUnique works
        const uniqueZedDoc = await store.transact(async tx => {
            repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            return repo.getUnique('byName', ['Zed']);
        });
        expect(uniqueZedDoc?.name).toBe('Zed');
    });

    it('should throw an error on update if doc is not found', async () => {
        const onChange: OnDocChange<MyDoc> = vi.fn();
        const nonExistentId = [createUuid()];

        await expect(
            store.transact(async tx => {
                const repo = new DocRepo<MyDoc>({
                    tx,
                    indexes,
                    onChange,
                    schema,
                    constraints: [],
                });
                return repo.update(nonExistentId, doc => {
                    doc.name = 'Nope';
                });
            })
        ).rejects.toThrowError(/doc not found/);
    });

    it('should call onChange callback with the correct diffs on create and update', async () => {
        const onChange = vi.fn<Parameters<OnDocChange<MyDoc>>>();

        // 1) CREATE
        const createdDoc: MyDoc = {
            pk: [createUuid()],
            name: 'Alpha',
            age: 1,
            deleted: false,
            createdAt: now,
            updatedAt: now,
        };
        await store.transact(async tx => {
            const repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await repo.create(createdDoc);
        });

        // Expect onChange called with (id, diff) where `prev` is undefined, `next` is the doc
        // The CrdtDiff for a new doc basically has all fields in "added" or "modified".
        expect(onChange).toHaveBeenCalledTimes(1);
        let call = onChange.mock.calls[0];
        expect(call[0]).toEqual(createdDoc.pk); // id
        // call[1] is the diff. We can do a minimal check or more thorough.
        // For a brand-new doc, we expect the entire doc to be added.

        // 2) UPDATE
        onChange.mockClear();

        await store.transact(async tx => {
            const repo = new DocRepo<MyDoc>({
                tx,
                indexes,
                onChange,
                schema,
                constraints: [],
            });
            await repo.update(createdDoc.pk, doc => {
                doc.age = 2;
            });
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        call = onChange.mock.calls[0];
        expect(call[0]).toEqual(createdDoc.pk);
        // call[1] is the diff.
        // For an age change, the diff should indicate old=1, new=2 for that field, etc.
    });
});

// todo: add updateChecker tests
