import {beforeEach, describe, expect, it} from 'vitest';
import {AppError} from '../errors.js';
import {toStream} from '../stream.js';
import {decodeTuple, encodeTuple, packNumber, unpackNumber} from '../tuple.js';
import {shuffle, whenAll} from '../utils.js';
import {MemAtomicStore, type AtomicStore} from './atomic-store.js';
import {InvalidQueryCondition, type Entry} from './kv-store.js';

describe('atomic-store', () => {
    let store: AtomicStore;

    function encodeKey(key: number): Uint8Array {
        return encodeTuple(packNumber(key));
    }

    function decodeKey(key: Uint8Array): number {
        return unpackNumber(decodeTuple(key));
    }

    function encodeValue(value: string): Uint8Array {
        return new TextEncoder().encode(value);
    }

    function decodeValue(bytes: Uint8Array): string {
        return new TextDecoder().decode(bytes);
    }

    beforeEach(() => {
        store = new MemAtomicStore();
    });

    describe('basic operations', () => {
        it('should write and read entries', async () => {
            await store.write([
                {key: encodeKey(1), value: encodeValue('one')},
                {key: encodeKey(2), value: encodeValue('two')},
                {key: encodeKey(3), value: encodeValue('three')},
            ]);

            const results = await toStream(
                store.read({gte: encodeKey(0)})
            ).toArray();

            expect(results).toHaveLength(3);
            expect(decodeValue(results[0].value)).toBe('one');
            expect(decodeValue(results[1].value)).toBe('two');
            expect(decodeValue(results[2].value)).toBe('three');
        });

        it('should delete entries by writing undefined', async () => {
            await store.write([
                {key: encodeKey(1), value: encodeValue('one')},
                {key: encodeKey(2), value: encodeValue('two')},
                {key: encodeKey(3), value: encodeValue('three')},
            ]);

            await store.write([{key: encodeKey(2), value: undefined}]);

            const results = await toStream(
                store.read({gte: encodeKey(0)})
            ).toArray();

            expect(results).toHaveLength(2);
            expect(decodeValue(results[0].value)).toBe('one');
            expect(decodeValue(results[1].value)).toBe('three');
        });

        it('should update existing entries', async () => {
            await store.write([
                {key: encodeKey(1), value: encodeValue('one')},
                {key: encodeKey(2), value: encodeValue('two')},
            ]);

            await store.write([
                {key: encodeKey(2), value: encodeValue('updated two')},
            ]);

            const results = await toStream(
                store.read({gte: encodeKey(0)})
            ).toArray();

            expect(results).toHaveLength(2);
            expect(decodeValue(results[0].value)).toBe('one');
            expect(decodeValue(results[1].value)).toBe('updated two');
        });
    });

    describe('query operations', () => {
        beforeEach(async () => {
            await store.write([
                {key: encodeKey(1), value: encodeValue('one')},
                {key: encodeKey(2), value: encodeValue('two')},
                {key: encodeKey(3), value: encodeValue('three')},
                {key: encodeKey(4), value: encodeValue('four')},
                {key: encodeKey(5), value: encodeValue('five')},
            ]);
        });

        it('should query with gt condition', async () => {
            const results = await toStream(
                store.read({gt: encodeKey(2)})
            ).toArray();

            expect(results).toHaveLength(3);
            expect(decodeValue(results[0].value)).toBe('three');
            expect(decodeValue(results[1].value)).toBe('four');
            expect(decodeValue(results[2].value)).toBe('five');
        });

        it('should return empty array for gt with no matches', async () => {
            const results = await toStream(
                store.read({gt: encodeKey(10)})
            ).toArray();
            expect(results).toHaveLength(0);
        });

        it('should query with gte condition', async () => {
            const results = await toStream(
                store.read({gte: encodeKey(3)})
            ).toArray();

            expect(results).toHaveLength(3);
            expect(decodeValue(results[0].value)).toBe('three');
            expect(decodeValue(results[1].value)).toBe('four');
            expect(decodeValue(results[2].value)).toBe('five');
        });

        it('should return empty array for gte with no matches', async () => {
            const results = await toStream(
                store.read({gte: encodeKey(10)})
            ).toArray();
            expect(results).toHaveLength(0);
        });

        it('should query with lt condition', async () => {
            const results = await toStream(
                store.read({lt: encodeKey(3)})
            ).toArray();

            expect(results).toHaveLength(2);
            expect(decodeValue(results[0].value)).toBe('two');
            expect(decodeValue(results[1].value)).toBe('one');
        });

        it('should return empty array for lt with no matches', async () => {
            const results = await toStream(
                store.read({lt: encodeKey(1)})
            ).toArray();
            expect(results).toHaveLength(0);
        });

        it('should query with lte condition', async () => {
            const results = await toStream(
                store.read({lte: encodeKey(3)})
            ).toArray();

            expect(results).toHaveLength(3);
            expect(decodeValue(results[0].value)).toBe('three');
            expect(decodeValue(results[1].value)).toBe('two');
            expect(decodeValue(results[2].value)).toBe('one');
        });

        it('should return empty array for lte with no matches', async () => {
            const results = await toStream(
                store.read({lte: encodeKey(0)})
            ).toArray();
            expect(results).toHaveLength(0);
        });
    });

    describe('error handling', () => {
        it('should throw error on invalid query condition', async () => {
            await expect(store.read({} as any).first()).rejects.toThrow(
                InvalidQueryCondition
            );
        });

        it('should throw error when operating on closed store', async () => {
            store.close('Test closure');

            await expect(() =>
                store.write([{key: encodeKey(1), value: encodeValue('one')}])
            ).rejects.toThrow(AppError);

            await expect(
                store.read({gt: encodeKey(0)}).first()
            ).rejects.toThrow(AppError);
        });
    });

    describe('edge cases', () => {
        it('should handle empty batch write', async () => {
            await store.write([]);
            const results = await toStream(
                store.read({gte: encodeKey(0)})
            ).toArray();
            expect(results).toHaveLength(0);
        });

        it('should handle writing and reading multiple entries in a single batch', async () => {
            const batch = Array.from({length: 100}, (_, i) => ({
                key: encodeKey(i),
                value: encodeValue(`value-${i}`),
            }));

            await store.write(batch);
            const results = await toStream(
                store.read({gte: encodeKey(0)})
            ).toArray();

            expect(results).toHaveLength(100);
            expect(decodeValue(results[50].value)).toBe('value-50');
        });

        it('should handle mixed operations in a single batch', async () => {
            await store.write([
                {key: encodeKey(1), value: encodeValue('one')},
                {key: encodeKey(2), value: encodeValue('two')},
                {key: encodeKey(3), value: encodeValue('three')},
            ]);

            await store.write([
                {key: encodeKey(2), value: undefined},
                {key: encodeKey(3), value: encodeValue('updated three')},
                {key: encodeKey(4), value: encodeValue('four')},
            ]);

            const results = await toStream(
                store.read({gte: encodeKey(0)})
            ).toArray();

            expect(results).toHaveLength(3);
            expect(decodeValue(results[0].value)).toBe('one');
            expect(decodeValue(results[1].value)).toBe('updated three');
            expect(decodeValue(results[2].value)).toBe('four');
        });
    });

    it('should maintain consistency with random concurrent operations', async () => {
        const testStore = new MemAtomicStore();

        const activePairs = new Map<number, boolean>();

        const getRandomInt = (min: number, max: number): number => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        const createPairs = (
            count: number
        ): Array<Entry<Uint8Array, Uint8Array>> => {
            const pairs: Array<Entry<Uint8Array, Uint8Array>> = [];
            for (let i = 0; i < count; i++) {
                // Generate a random number that's not already active
                let num;
                do {
                    num = getRandomInt(1, 1000);
                } while (activePairs.has(num));

                activePairs.set(num, true);
                const value = getRandomInt(1, 100);

                // Add pair with positive and negative values
                pairs.push({
                    key: encodeKey(num),
                    value: encodeValue(value.toString()),
                });
                pairs.push({
                    key: encodeKey(-num),
                    value: encodeValue((-value).toString()),
                });
            }
            return shuffle(pairs);
        };

        // Delete a random balanced pair
        const deletePair = (): Array<
            Entry<Uint8Array, Uint8Array | undefined>
        > => {
            if (activePairs.size === 0) return [];

            const keys = Array.from(activePairs.keys());
            const keyToDelete = keys[Math.floor(Math.random() * keys.length)];
            activePairs.delete(keyToDelete);

            return shuffle([
                {key: encodeKey(keyToDelete), value: undefined},
                {key: encodeKey(-keyToDelete), value: undefined},
            ]);
        };

        const verifyConsistency = async () => {
            const ascResults = await toStream(
                testStore.read({gte: encodeKey(-10000)})
            ).toArray();
            let previousKey = Number.MIN_SAFE_INTEGER;
            let sum = 0;

            for (const entry of ascResults) {
                const key = decodeKey(entry.key);
                const value = parseInt(decodeValue(entry.value), 10);

                expect(key).toBeGreaterThan(previousKey);
                previousKey = key;

                sum += value;
            }

            expect(sum).toBe(0);

            sum = 0;
            const descResults = await toStream(
                testStore.read({lte: encodeKey(10000)})
            ).toArray();
            previousKey = Number.MAX_SAFE_INTEGER;

            for (const entry of descResults) {
                const key = decodeKey(entry.key);

                expect(key).toBeLessThan(previousKey);
                previousKey = key;

                sum += parseInt(decodeValue(entry.value), 10);
            }

            expect(sum).toBe(0);

            expect(ascResults.length).toBe(activePairs.size * 2);
        };

        // Perform random operations
        const pendingOperations: Promise<void>[] = [];
        const operationCount = 50_000;

        for (let i = 0; i < operationCount; i++) {
            const operation =
                Math.random() < 0.2
                    ? testStore.write(createPairs(getRandomInt(1, 7)))
                    : testStore.write(deletePair());

            // Add to pending operations without awaiting immediately
            pendingOperations.push(operation);

            // Periodically verify and clean up to avoid overwhelming memory
            if (pendingOperations.length >= 50 || i === operationCount - 1) {
                // Wait for current batch of operations to complete
                await whenAll(pendingOperations);
                pendingOperations.length = 0;

                // Verify consistency
                await verifyConsistency();
            }
        }

        await verifyConsistency();
    }, 30000);
});
