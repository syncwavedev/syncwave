import {describe, expect, it, vi} from 'vitest';
import {CursorProxy, KVStoreProxy, TransactionProxy} from './kv-store-proxy';

// Mock implementations for dependencies
const mockCursor = {
    next: vi.fn().mockResolvedValue({done: false, value: null}),
    close: vi.fn().mockResolvedValue(undefined),
};

const mockCrud = {
    get: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(mockCursor),
    put: vi.fn().mockResolvedValue(undefined),
};

const mockKVStore = {
    transaction: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(mockCursor),
    put: vi.fn().mockResolvedValue(undefined),
};

describe('CursorProxy', () => {
    it('should call handler.next if defined', async () => {
        const handler = {
            next: vi.fn(() =>
                Promise.resolve({type: 'entry' as const, key: 'handlerNextKey', value: 'handlerNextValue'})
            ),
        };
        const proxy = new CursorProxy(mockCursor, handler);

        const result = await proxy.next();

        expect(handler.next).toHaveBeenCalledWith(mockCursor);
        expect(result).toEqual({type: 'entry', key: 'handlerNextKey', value: 'handlerNextValue'});
    });

    it('should fallback to target.next if handler.next is undefined', async () => {
        mockCursor.next.mockResolvedValue({type: 'entry' as const, key: 'handlerNextKey', value: 'handlerNextValue'});
        const handler = {};
        const proxy = new CursorProxy(mockCursor, handler);

        const result = await proxy.next();

        expect(mockCursor.next).toHaveBeenCalled();
        expect(result).toEqual({type: 'entry' as const, key: 'handlerNextKey', value: 'handlerNextValue'});
    });

    it('should call handler.close if defined', async () => {
        const handler = {close: vi.fn(() => Promise.resolve())};
        const proxy = new CursorProxy(mockCursor, handler);

        await proxy.close();

        expect(handler.close).toHaveBeenCalledWith(mockCursor);
    });

    it('should fallback to target.close if handler.close is undefined', async () => {
        mockCursor.close.mockResolvedValue(undefined);
        const handler = {};
        const proxy = new CursorProxy(mockCursor, handler);

        await proxy.close();

        expect(mockCursor.close).toHaveBeenCalled();
    });
});

describe('TransactionProxy', () => {
    it('should call handler.get if defined', async () => {
        const handler = {get: vi.fn(() => Promise.resolve('handlerGetResult'))};
        const proxy = new TransactionProxy(mockCrud, handler);

        const result = await proxy.get('key');

        expect(handler.get).toHaveBeenCalledWith(mockCrud, 'key');
        expect(result).toBe('handlerGetResult');
    });

    it('should fallback to target.get if handler.get is undefined', async () => {
        mockCrud.get.mockResolvedValue('targetGetResult');
        const handler = {};
        const proxy = new TransactionProxy(mockCrud, handler);

        const result = await proxy.get('key');

        expect(mockCrud.get).toHaveBeenCalledWith('key');
        expect(result).toBe('targetGetResult');
    });

    it('should call handler.query if defined', async () => {
        const handler = {query: vi.fn(() => Promise.resolve(mockCursor))};
        const proxy = new TransactionProxy(mockCrud, handler);

        const result = await proxy.query('condition' as any);

        expect(handler.query).toHaveBeenCalledWith(mockCrud, 'condition');
        expect(result).toBe(mockCursor);
    });

    it('should fallback to target.query if handler.query is undefined', async () => {
        mockCrud.query.mockResolvedValue(mockCursor);
        const handler = {};
        const proxy = new TransactionProxy(mockCrud, handler);

        const result = await proxy.query('condition' as any);

        expect(mockCrud.query).toHaveBeenCalledWith('condition');
        expect(result).toBe(mockCursor);
    });

    it('should call handler.put if defined', async () => {
        const handler = {put: vi.fn(() => Promise.resolve())};
        const proxy = new TransactionProxy(mockCrud, handler);

        await proxy.put('key', 'value');

        expect(handler.put).toHaveBeenCalledWith(mockCrud, 'key', 'value');
    });

    it('should fallback to target.put if handler.put is undefined', async () => {
        mockCrud.put.mockResolvedValue(undefined);
        const handler = {};
        const proxy = new TransactionProxy(mockCrud, handler);

        await proxy.put('key', 'value');

        expect(mockCrud.put).toHaveBeenCalledWith('key', 'value');
    });
});

describe('KVStoreProxy', () => {
    it('should call handler.transaction if defined', async () => {
        const handler = {transaction: vi.fn(() => Promise.resolve('handlerTransactionResult' as any))};
        const proxy = new KVStoreProxy(mockKVStore, handler);

        const result = await proxy.transaction(() => Promise.resolve('txnResult'));

        expect(handler.transaction).toHaveBeenCalledWith(mockKVStore, expect.any(Function));
        expect(result).toBe('handlerTransactionResult');
    });

    it('should fallback to target.transaction if handler.transaction is undefined', async () => {
        mockKVStore.transaction.mockResolvedValue('targetTransactionResult');
        const handler = {};
        const proxy = new KVStoreProxy(mockKVStore, handler);

        const result = await proxy.transaction(() => Promise.resolve('txnResult'));

        expect(mockKVStore.transaction).toHaveBeenCalledWith(expect.any(Function));
        expect(result).toBe('targetTransactionResult');
    });

    it('should call handler.get if defined', async () => {
        const handler = {get: vi.fn(() => Promise.resolve('handlerGetResult'))};
        const proxy = new KVStoreProxy(mockKVStore, handler);

        const result = await proxy.get('key');

        expect(handler.get).toHaveBeenCalledWith(mockKVStore, 'key');
        expect(result).toBe('handlerGetResult');
    });

    it('should fallback to target.get if handler.get is undefined', async () => {
        mockKVStore.get.mockResolvedValue('targetGetResult');
        const handler = {};
        const proxy = new KVStoreProxy(mockKVStore, handler);

        const result = await proxy.get('key');

        expect(mockKVStore.get).toHaveBeenCalledWith('key');
        expect(result).toBe('targetGetResult');
    });

    it('should call handler.query if defined', async () => {
        const handler = {query: vi.fn(() => Promise.resolve(mockCursor))};
        const proxy = new KVStoreProxy(mockKVStore, handler);

        const result = await proxy.query('condition' as any);

        expect(handler.query).toHaveBeenCalledWith(mockKVStore, 'condition');
        expect(result).toBeInstanceOf(CursorProxy);
    });

    it('should fallback to target.query if handler.query is undefined', async () => {
        mockKVStore.query.mockResolvedValue(mockCursor);
        const handler = {};
        const proxy = new KVStoreProxy(mockKVStore, handler);

        const result = await proxy.query('condition' as any);

        expect(mockKVStore.query).toHaveBeenCalledWith('condition');
        expect(result).toBeInstanceOf(CursorProxy);
    });

    it('should call handler.put if defined', async () => {
        const handler = {put: vi.fn(() => Promise.resolve())};
        const proxy = new KVStoreProxy(mockKVStore, handler);

        await proxy.put('key', 'value');

        expect(handler.put).toHaveBeenCalledWith(mockKVStore, 'key', 'value');
    });

    it('should fallback to target.put if handler.put is undefined', async () => {
        mockKVStore.put.mockResolvedValue(undefined);
        const handler = {};
        const proxy = new KVStoreProxy(mockKVStore, handler);

        await proxy.put('key', 'value');

        expect(mockKVStore.put).toHaveBeenCalledWith('key', 'value');
    });
});
