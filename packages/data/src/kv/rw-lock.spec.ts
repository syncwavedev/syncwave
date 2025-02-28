import {describe, expect, it} from 'vitest';
import {AppError} from '../errors.js';
import {whenAll} from '../utils.js';
import {RwLock} from './rw-lock.js';

describe('RwLock', () => {
    it('should acquire a read lock when not locked', async () => {
        const rwLock = new RwLock();
        await expect(rwLock.readLock()).resolves.toBeUndefined();
    });

    it('should acquire a write lock when not locked', async () => {
        const rwLock = new RwLock();
        await expect(rwLock.writeLock()).resolves.toBeUndefined();
    });

    it('should release a read lock', async () => {
        const rwLock = new RwLock();
        await rwLock.readLock();
        expect(() => rwLock.unlockRead()).not.toThrow();
    });

    it('should release a write lock', async () => {
        const rwLock = new RwLock();
        await rwLock.writeLock();
        expect(() => rwLock.unlockWrite()).not.toThrow();
    });

    it('should throw when unlocking a read lock that is not held', () => {
        const rwLock = new RwLock();
        expect(() => rwLock.unlockRead()).toThrow(
            new AppError('Read lock is not held')
        );
    });

    it('should throw when unlocking a write lock that is not held', () => {
        const rwLock = new RwLock();
        expect(() => rwLock.unlockWrite()).toThrow(
            new AppError('Write lock is not held')
        );
    });

    it('should allow multiple read locks to be held simultaneously', async () => {
        const rwLock = new RwLock();
        await rwLock.readLock();
        await expect(rwLock.readLock()).resolves.toBeUndefined();

        expect(() => rwLock.unlockRead()).not.toThrow();
        expect(() => rwLock.unlockRead()).not.toThrow();
    });

    it('should wait for read locks to be released before acquiring write lock', async () => {
        const rwLock = new RwLock();
        await rwLock.readLock();

        const writeLockPromise = rwLock.writeLock();
        const resolved = await Promise.race([
            writeLockPromise.then(() => true),
            Promise.resolve(false),
        ]);
        expect(resolved).toBe(false);

        rwLock.unlockRead();
        await expect(writeLockPromise).resolves.toBeUndefined();
    });

    it('should wait for write lock to be released before acquiring read lock', async () => {
        const rwLock = new RwLock();
        await rwLock.writeLock();

        const readLockPromise = rwLock.readLock();
        const resolved = await Promise.race([
            readLockPromise.then(() => true),
            Promise.resolve(false),
        ]);
        expect(resolved).toBe(false);

        rwLock.unlockWrite();
        await expect(readLockPromise).resolves.toBeUndefined();
    });

    it('should release locks in the correct order', async () => {
        const rwLock = new RwLock();
        await rwLock.writeLock();

        const order: number[] = [];
        const lock1 = rwLock.readLock().then(() => {
            order.push(1);
        });
        const lock2 = rwLock.writeLock().then(() => {
            order.push(2);
        });
        const lock3 = rwLock.readLock().then(() => {
            order.push(3);
        });

        expect(order).toEqual([]);
        rwLock.unlockWrite();

        await lock1;
        expect(order).toEqual([1, 3]);
        rwLock.unlockRead();
        rwLock.unlockRead();

        await lock2;
        expect(order).toEqual([1, 3, 2]);
        rwLock.unlockWrite();

        await lock3;
        expect(order).toEqual([1, 3, 2]);
    });

    it('should prioritize waiting write locks before new read locks', async () => {
        const rwLock = new RwLock();
        await rwLock.readLock();

        const order: number[] = [];
        const writeLockPromise = rwLock.writeLock().then(() => {
            order.push(1);
            rwLock.unlockWrite();
        });

        await Promise.resolve();

        const readLockPromise = rwLock.readLock().then(() => {
            order.push(2);
            rwLock.unlockRead();
        });

        rwLock.unlockRead();

        await whenAll([writeLockPromise, readLockPromise]);

        expect(order).toEqual([1, 2]);
    });

    it('should handle concurrent read and write operations correctly', async () => {
        const rwLock = new RwLock();
        const ops: string[] = [];

        const reader1 = async () => {
            await rwLock.readLock();
            ops.push('reader1-start');
            await new Promise(resolve => setTimeout(resolve, 10));
            ops.push('reader1-end');
            rwLock.unlockRead();
        };

        const reader2 = async () => {
            await rwLock.readLock();
            ops.push('reader2-start');
            await new Promise(resolve => setTimeout(resolve, 5));
            ops.push('reader2-end');
            rwLock.unlockRead();
        };

        const writer = async () => {
            await rwLock.writeLock();
            ops.push('writer-start');
            await new Promise(resolve => setTimeout(resolve, 5));
            ops.push('writer-end');
            rwLock.unlockWrite();
        };

        const reader1Promise = reader1();

        const [writerPromise, reader2Promise] = [writer(), reader2()];

        await whenAll([reader1Promise, writerPromise, reader2Promise]);

        expect(ops).toEqual([
            'reader1-start',
            'reader1-end',
            'writer-start',
            'writer-end',
            'reader2-start',
            'reader2-end',
        ]);
    });

    it('should allow all waiting readers to acquire lock after writer releases', async () => {
        const rwLock = new RwLock();
        await rwLock.writeLock();

        const readPromises = [1, 2, 3].map(i =>
            rwLock.readLock().then(() => `reader-${i}`)
        );

        rwLock.unlockWrite();

        const results = await whenAll(readPromises);
        expect(results).toEqual(['reader-1', 'reader-2', 'reader-3']);

        [1, 2, 3].forEach(() => rwLock.unlockRead());
    });

    it('should handle multiple writes and reads in sequence', async () => {
        const rwLock = new RwLock();
        const sequence: string[] = [];

        await rwLock.writeLock();
        sequence.push('write-1-acquired');

        const read1Promise = rwLock.readLock().then(() => {
            sequence.push('read-1-acquired');
            rwLock.unlockRead();
            sequence.push('read-1-released');
        });

        const write2Promise = rwLock.writeLock().then(() => {
            sequence.push('write-2-acquired');
            rwLock.unlockWrite();
            sequence.push('write-2-released');
        });

        const read2Promise = rwLock.readLock().then(() => {
            sequence.push('read-2-acquired');
            rwLock.unlockRead();
            sequence.push('read-2-released');
        });

        rwLock.unlockWrite();
        sequence.push('write-1-released');

        await whenAll([read1Promise, write2Promise, read2Promise]);

        expect(sequence).toEqual([
            'write-1-acquired',
            'write-1-released',
            'read-1-acquired',
            'read-1-released',
            'read-2-acquired',
            'read-2-released',
            'write-2-acquired',
            'write-2-released',
        ]);
    });
});
