import {z} from 'zod';
import {DataAccessor} from './actor';
import {Message} from './communication/message';
import {createApi, handler, setupRpcServer} from './communication/rpc';
import {Connection} from './communication/transport';
import {SignInResponse, SignUpResponse} from './coordinator';
import {CoordinatorClient} from './coordinator-client';

// todo: add auto reconnect connection (it must buffer messages before sending them to an new connection)
export class Participant {
    private client: CoordinatorClient;

    constructor(private readonly connection: Connection<Message>) {
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
