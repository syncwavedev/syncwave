import {z} from 'zod';
import {DataAccessor} from './actor.js';
import {Message} from './communication/message.js';
import {ReconnectConnection} from './communication/reconnect-connection.js';
import {createApi, handler, setupRpcServer} from './communication/rpc.js';
import {Connection, TransportClient} from './communication/transport.js';
import {CoordinatorClient} from './coordinator-client.js';
import {SignInResponse, SignUpResponse} from './coordinator.js';

// todo: add auto reconnect connection (it must buffer messages before sending them to an new connection)
export class Participant {
    private client: CoordinatorClient;
    private readonly connection: Connection<Message>;

    constructor(transport: TransportClient<Message>) {
        this.connection = new ReconnectConnection(transport);
        this.client = new CoordinatorClient(this.connection);
        setupRpcServer(this.connection, createParticipantRpc, (_message, fn) => fn({}));
    }

    async signIn(email: string, password: string): Promise<SignInResponse> {
        return await this.client.rpc.signIn({email, password});
    }

    async signUp(email: string, password: string): Promise<SignUpResponse> {
        return await this.client.rpc.signUp({email, password});
    }

    async debug() {
        return await this.client.rpc.debug({});
    }

    authenticate(authToken: string): void {
        this.client.authenticate(authToken);
    }

    public get db(): DataAccessor {
        return this.client.rpc;
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
