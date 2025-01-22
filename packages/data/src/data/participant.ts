import {z} from 'zod';
import {DataAccessor} from './actor.js';
import {Message} from './communication/message.js';
import {ReconnectConnection} from './communication/reconnect-connection.js';
import {createApi, handler, setupRpcServer} from './communication/rpc.js';
import {Connection, TransportClient} from './communication/transport.js';
import {CoordinatorClient} from './coordinator-client.js';

// todo: add auto reconnect connection (it must buffer messages before sending them to an new connection)
export class Participant {
    private coordinator: CoordinatorClient;
    private readonly connection: Connection<Message>;

    constructor(
        transport: TransportClient<Message>,
        private readonly mode: 'proxy' | 'local'
    ) {
        this.connection = new ReconnectConnection(transport);
        this.coordinator = new CoordinatorClient(this.connection);
        setupRpcServer(this.connection, createParticipantRpc, (_message, fn) => fn({}));
    }

    async sendSignInEmail(email: string) {
        return await this.coordinator.rpc.sendSignInEmail({email});
    }

    async verifySignInCode(email: string, code: string) {
        return await this.coordinator.rpc.verifySignInCode({email, code});
    }

    async debug() {
        return await this.coordinator.rpc.debug({});
    }

    authenticate(authToken: string): void {
        this.coordinator.authenticate(authToken);
    }

    public get db(): DataAccessor {
        return this.coordinator.rpc;
    }

    async close(): Promise<void> {
        await this.connection.close();
    }
}

function createParticipantRpc() {
    return createApi({
        echo: handler({
            schema: z.object({message: z.string()}),
            handle: async ({message}) => ({message}),
        }),
    });
}

export type ParticipantRpc = ReturnType<typeof createParticipantRpc>;
