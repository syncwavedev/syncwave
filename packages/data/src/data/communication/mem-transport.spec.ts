import {describe, expect, it, vi} from 'vitest';
import {MsgpackrCodec} from '../../codec.js';
import {
    MemConnection,
    MemTransportClient,
    MemTransportServer,
} from './mem-transport.js';
import {Message, createMessageId} from './message.js';

const mockMessage: Message = {
    type: 'request',
    id: createMessageId(),
    payload: {name: 'ping', arg: {}},
};

describe('MemConnection', async () => {
    it('should create a pair of MemConnections', async () => {
        console.log('hello');
        const [conn1, conn2] = MemConnection.create<Message>(
            new MsgpackrCodec()
        );
        expect(conn1).toBeDefined();
        expect(conn2).toBeDefined();
        let value: any = undefined;
        const unsub = conn2.subscribe({
            next: async message => {
                value = message;
            },
            throw: error => {
                throw error;
            },
            close: async () => {
                // do nothing
            },
        });
        await conn1.send(mockMessage);
        unsub();

        expect(value).toEqual(mockMessage);
    });

    it('should send and receive messages between peers', async () => {
        const [conn1, conn2] = MemConnection.create<Message>(
            new MsgpackrCodec()
        );
        conn1['open'] = true;
        conn2['open'] = true;

        const messageHandler = vi.fn();
        conn2.subscribe({
            next: async message => {
                messageHandler(message);
            },
            throw: error => {
                throw error;
            },
            close: async () => {
                throw new Error('unexpectedly closed');
            },
        });

        await conn1.send(mockMessage);
        expect(messageHandler).toHaveBeenCalledWith(mockMessage);
    });

    it('should throw error if send is called on a closed connection', async () => {
        const [conn1, conn2] = MemConnection.create<Message>(
            new MsgpackrCodec()
        );
        await conn2.close();

        await expect(conn1.send(mockMessage)).rejects.toThrowError(
            'connection is closed'
        );
    });

    it('should allow subscribing and unsubscribing', async () => {
        const [conn1, conn2] = MemConnection.create<Message>(
            new MsgpackrCodec()
        );

        const messageHandler = vi.fn();
        const unsubscribe = conn2.subscribe({
            next: async message => messageHandler(message),
            throw: error => {
                throw error;
            },
            close: () => {
                throw new Error('unexpectedly closed');
            },
        });

        await conn1.send(mockMessage);
        expect(messageHandler).toHaveBeenCalledWith(mockMessage);

        unsubscribe();
        await conn1.send(mockMessage);
        expect(messageHandler).toHaveBeenCalledTimes(1);
    });

    it('should close the connection and notify subscribers', async () => {
        const [conn1] = MemConnection.create<Message>(new MsgpackrCodec());
        conn1['open'] = true;

        const closeHandler = vi.fn();
        conn1.subscribe({
            next: () => {
                throw new Error('unexpected message');
            },
            throw: error => {
                throw error;
            },
            close: async () => closeHandler(),
        });

        await conn1.close();
        expect(closeHandler).toHaveBeenCalledWith();
        expect(() => conn1['ensureOpen']()).toThrowError(
            'connection is closed'
        );
    });
});

describe('MemTransportServer and MemTransportClient', () => {
    it('should accept connections from clients', async () => {
        const server = new MemTransportServer(new MsgpackrCodec());

        const connectionHandler = vi.fn();
        await server.launch(connectionHandler);

        const client = new MemTransportClient(server, new MsgpackrCodec());
        const clientConnection = await client.connect();

        expect(connectionHandler).toHaveBeenCalledTimes(1);
        expect(clientConnection).toBeDefined();
    });

    it('should throw an error if no listeners are active', async () => {
        const server = new MemTransportServer(new MsgpackrCodec());
        const client = new MemTransportClient(server, new MsgpackrCodec());

        await expect(client.connect()).rejects.toThrowError(
            'server is not active'
        );
    });

    it('should close the server and clear subscriptions', async () => {
        const server = new MemTransportServer(new MsgpackrCodec());
        const client = server.createClient();

        const connectionHandler = vi.fn();
        await server.launch(connectionHandler);

        await server.close();

        await expect(() => client.connect()).rejects.toThrow(
            /server is not active/
        );
    });
});
