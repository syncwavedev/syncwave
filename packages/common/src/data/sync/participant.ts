import {z} from 'zod';
import {Db} from '../data-provider';
import {SignInResponse} from './coordinator';
import {CoordinatorClient} from './coordinator-client';
import {createApi, handler, setupRpcServer} from './rpc';
import {Connection} from './transport';

// todo: add auto reconnect connection (it must buffer messages before sending them to an new connection)
export class Participant {
    private client: CoordinatorClient;

    private constructor(private readonly connection: Connection) {
        this.client = new CoordinatorClient(this.connection);
        setupRpcServer(this.connection, createParticipantRpc, (_message, fn) => fn({}));
    }

    async signIn(email: string, password: string): Promise<SignInResponse> {
        return await this.client.rpc.signIn({email, password});
    }

    authenticate(authToken: string): void {
        this.client.authenticate(authToken);
    }

    public get db(): Db {
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
