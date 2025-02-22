import type {Tracer} from '@opentelemetry/api';
import {context} from '../context.js';
import {PersistentConnection} from '../transport/persistent-connection.js';
import {RpcConnection} from '../transport/rpc-transport.js';
import {createRpcClient} from '../transport/rpc.js';
import type {TransportClient} from '../transport/transport.js';
import {createParticipantApi, type ParticipantRpc} from './participant-api.js';

export class ParticipantClient {
    private readonly connection: RpcConnection;
    public readonly rpc: ParticipantRpc;

    constructor(
        transport: TransportClient<unknown>,
        private authToken: string | undefined,
        tracer: Tracer
    ) {
        this.connection = new RpcConnection(
            new PersistentConnection(transport)
        );
        this.rpc = createRpcClient(
            createParticipantApi(),
            this.connection,
            () => ({
                ...context().extract(),
                auth: this.authToken,
            }),
            'part',
            tracer
        );
    }

    setAuthToken(token: string | undefined) {
        this.authToken = token;
    }

    close(reason: unknown): void {
        this.connection.close(reason);
    }
}
