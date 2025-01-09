import {z} from 'zod';
import {createApi, handler, setupRpcServer} from './communication/rpc';
import {Connection} from './communication/transport';
import {SignInResponse} from './coordinator';
import {CoordinatorClient} from './coordinator-client';
import {DataAccessor} from './db';

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
