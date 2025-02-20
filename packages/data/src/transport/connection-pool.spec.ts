import {beforeEach, describe, expect, it, vi} from 'vitest';
import {StringCodec} from '../codec.js';
import {ConnectionPool, ReleasableConnection} from './connection-pool.js';
import {MemTransportClient, MemTransportServer} from './mem-transport.js';
import {
    catchConnectionClosed,
    type Connection,
    ConnectionClosedError,
} from './transport.js';

class MockTransportClient {
    connect() {
        return Promise.resolve({
            send: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {
                return () => {};
            }),
            close: vi.fn(),
        });
    }
}

describe('ConnectionPool', () => {
    let client: MockTransportClient;
    let pool: ConnectionPool<any>;

    beforeEach(() => {
        client = new MockTransportClient();
        pool = new ConnectionPool(client);
    });

    it('should create a new connection when there are no free connections', async () => {
        vi.spyOn(client, 'connect');
        const connection = await pool.connect();

        expect(client.connect).toHaveBeenCalledTimes(1);

        expect(connection).toBeInstanceOf(ReleasableConnection);
    });

    it('should reuse an available connection from the pool', async () => {
        vi.spyOn(client, 'connect');

        const firstConnection = await pool.connect();
        firstConnection.close('test close');
        const secondConnection = await pool.connect();

        expect(client.connect).toHaveBeenCalledTimes(1);
        expect(firstConnection['connection']).toBe(
            secondConnection['connection']
        );
    });

    it('should not reuse an available connection from the pool', async () => {
        vi.spyOn(client, 'connect');

        const firstConnection = await pool.connect();
        const secondConnection = await pool.connect();

        expect(client.connect).toHaveBeenCalledTimes(2);
        expect(firstConnection['connection']).not.toBe(
            secondConnection['connection']
        );
    });

    it('should close connections when the pool is closed', async () => {
        const connection = await pool.connect();
        const closeSpy = vi.spyOn(connection['connection'], 'close');

        await pool.close('test close');

        expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should properly release connections back to the pool', async () => {
        const connection1 = await pool.connect();
        const connection2 = await pool.connect();

        connection1.close('test close');

        const connection3 = await pool.connect();
        expect(connection3['connection']).toBe(connection1['connection']);
    });

    it('should handle connection closure gracefully', async () => {
        const connection = await pool.connect();
        const closeSpy = vi.spyOn(connection, 'close');

        connection.close('test close');

        const newConnection = await pool.connect();

        expect(newConnection).not.toBe(connection);
        expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should catch connection closed error in async operations', async () => {
        const connection = await pool.connect();
        vi.spyOn(connection, 'send').mockRejectedValueOnce(
            new ConnectionClosedError('test close')
        );

        const result = await catchConnectionClosed(connection.send('message'));

        expect(result).toBeUndefined();
    });

    it('should unsubscribe from underlying connection when closed', async () => {
        const memTransportServer = new MemTransportServer(new StringCodec());
        const pool = new ConnectionPool(
            new MemTransportClient(memTransportServer, new StringCodec())
        );

        let serverConn: Connection<string> | undefined = undefined;
        await memTransportServer.launch(conn => {
            serverConn = conn;
        });

        const connection = await pool.connect();
        expect(serverConn).toBeDefined();

        let closeCalled = false;
        let throwCalled = false;
        let nextCalled = false;
        connection.subscribe({
            next: async () => {
                nextCalled = true;
            },
            throw: async () => {
                throwCalled = true;
            },
            close() {
                closeCalled = true;
            },
        });

        connection.close('test close');

        expect(closeCalled).toBe(true);

        await (serverConn as unknown as Connection<string>).send('message');

        expect(nextCalled).toBe(false);
        expect(throwCalled).toBe(false);
    });
});
