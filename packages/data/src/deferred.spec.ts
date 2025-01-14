import {describe, expect, it, vi} from 'vitest';
import {Deferred} from './deferred';

describe('Deferred', () => {
    it('should initialize with a pending state', () => {
        const deferred = new Deferred();
        expect(deferred.state).toBe('pending');
    });

    it('should resolve with the given value', async () => {
        const deferred = new Deferred();
        const value = 'testValue';

        deferred.resolve(value);

        expect(deferred.state).toBe('resolved');
        await expect(deferred.promise).resolves.toBe(value);
    });

    it('should reject with the given error', async () => {
        const deferred = new Deferred();
        const error = new Error('testError');

        deferred.reject(error);

        expect(deferred.state).toBe('rejected');
        await expect(deferred.promise).rejects.toThrow(error);
    });

    it('should not resolve again after being resolved', async () => {
        const deferred = new Deferred();
        const firstValue = 'firstValue';
        const secondValue = 'secondValue';

        deferred.resolve(firstValue);
        deferred.resolve(secondValue);

        expect(deferred.state).toBe('resolved');
        await expect(deferred.promise).resolves.toBe(firstValue);
    });

    it('should not reject again after being rejected', async () => {
        const deferred = new Deferred();
        const firstError = new Error('firstError');
        const secondError = new Error('secondError');

        deferred.reject(firstError);
        deferred.reject(secondError);

        expect(deferred.state).toBe('rejected');
        await expect(deferred.promise).rejects.toThrow(firstError);
    });

    it('should not resolve after being rejected', async () => {
        const deferred = new Deferred();
        const error = new Error('testError');
        const value = 'testValue';

        deferred.reject(error);
        deferred.resolve(value);

        expect(deferred.state).toBe('rejected');
        await expect(deferred.promise).rejects.toThrow(error);
    });

    it('should not reject after being resolved', async () => {
        const deferred = new Deferred();
        const value = 'testValue';
        const error = new Error('testError');

        deferred.resolve(value);
        deferred.reject(error);

        expect(deferred.state).toBe('resolved');
        await expect(deferred.promise).resolves.toBe(value);
    });

    it('should execute resolve callback when resolved', async () => {
        const deferred = new Deferred();
        const value = 'testValue';
        const onResolved = vi.fn();

        deferred.promise.then(onResolved);
        deferred.resolve(value);

        await deferred.promise;

        expect(onResolved).toHaveBeenCalledWith(value);
    });

    it('should execute reject callback when rejected', async () => {
        const deferred = new Deferred();
        const error = new Error('testError');
        const onRejected = vi.fn();

        deferred.promise.catch(onRejected);
        deferred.reject(error);

        try {
            await deferred.promise;
        } catch {
            // swallow
        }

        expect(onRejected).toHaveBeenCalledWith(error);
    });

    it('should maintain the resolved value after resolution', async () => {
        const deferred = new Deferred();
        const value = 'testValue';

        deferred.resolve(value);

        expect(deferred.state).toBe('resolved');
        expect((deferred as any)._state.value).toBe(value);
    });

    it('should maintain the rejection error after rejection', async () => {
        const deferred = new Deferred();
        const error = new Error('testError');

        deferred.reject(error);

        deferred.promise.catch(() => {});

        expect(deferred.state).toBe('rejected');
        expect((deferred as any)._state.error).toBe(error);
    });
});
