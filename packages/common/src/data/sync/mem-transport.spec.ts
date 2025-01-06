import {describe, expect, it, vi} from 'vitest';
import {MemConnection, MemTransportClient, MemTransportServer} from './mem-transport';
import {Message, createMessageId} from './message';

const mockMessage: Message = {type: 'ping', id: createMessageId()};

describe('MemConnection', () => {
    it('should create a pair of MemConnections', () => {
        const [conn1, conn2] = MemConnection.create();
        expect(conn1).toBeDefined();
        expect(conn2).toBeDefined();
        expect(() => conn1.send(mockMessage)).not.toThrowError();
    });

    it('should send and receive messages between peers', async () => {
        const [conn1, conn2] = MemConnection.create();
        conn1['open'] = true;
        conn2['open'] = true;

        const messageHandler = vi.fn();
        conn2.subscribe((...args) => {
            if (args[0] === 'message') {
                messageHandler(args[1]);
            }
        });

        await conn1.send(mockMessage);
        expect(messageHandler).toHaveBeenCalledWith(mockMessage);
    });

    it('should throw error if send is called on a closed connection', async () => {
        const [conn1, conn2] = MemConnection.create();
        conn1['open'] = false;
        conn2['open'] = true;

        await expect(conn1.send(mockMessage)).rejects.toThrowError('connection is closed');
    });

    it('should allow subscribing and unsubscribing', () => {
        const [conn1, conn2] = MemConnection.create();
        conn1['open'] = true;
        conn2['open'] = true;

        const messageHandler = vi.fn();
        const unsubscribe = conn1.subscribe(messageHandler);

        conn1['subs'][0]('message', mockMessage);
        expect(messageHandler).toHaveBeenCalledWith('message', mockMessage);

        unsubscribe();
        conn1['subs'][0]?.('message', mockMessage);
        expect(messageHandler).toHaveBeenCalledTimes(1);
    });

    it('should close the connection and notify subscribers', async () => {
        const [conn1] = MemConnection.create();
        conn1['open'] = true;

        const closeHandler = vi.fn();
        conn1.subscribe(closeHandler);

        await conn1.close();
        expect(closeHandler).toHaveBeenCalledWith('close');
        expect(() => (conn1 as any).ensureOpen()).toThrowError('connection is closed');
    });
});

describe('MemTransportServer and MemTransportClient', () => {
    it('should accept connections from clients', async () => {
        const server = new MemTransportServer();

        const connectionHandler = vi.fn();
        server.listen(connectionHandler);

        const client = new MemTransportClient(server);
        const clientConnection = await client.connect();

        expect(connectionHandler).toHaveBeenCalledTimes(1);
        expect(clientConnection).toBeDefined();
    });

    it('should throw an error if no listeners are active', async () => {
        const server = new MemTransportServer();
        const client = new MemTransportClient(server);

        await expect(client.connect()).rejects.toThrowError('server is not active');
    });

    it('should allow subscribing and unsubscribing to server listeners', () => {
        const server = new MemTransportServer();

        const connectionHandler = vi.fn();
        const unsubscribe = server.listen(connectionHandler);

        const mockConnection = {};
        server.accept(mockConnection as MemConnection);
        expect(connectionHandler).toHaveBeenCalledWith(mockConnection);

        unsubscribe();
        expect(() => server.accept(mockConnection as MemConnection)).toThrowError();
    });

    it('should close the server and clear subscriptions', async () => {
        const server = new MemTransportServer();

        const connectionHandler = vi.fn();
        server.listen(connectionHandler);

        await server.close();

        expect(server['subs']).toHaveLength(0);
    });
});
