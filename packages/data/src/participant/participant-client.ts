import type {Tracer} from '@opentelemetry/api';
import {context} from '../context.js';
import type {Message} from '../transport/message.js';
import {PersistentConnection} from '../transport/persistent-connection.js';
import {createRpcClient} from '../transport/rpc.js';
import type {Connection, TransportClient} from '../transport/transport.js';
import {createParticipantApi, type ParticipantRpc} from './participant-api.js';

export class ParticipantClient {
    private readonly connection: Connection<Message>;
    public readonly rpc: ParticipantRpc;

    constructor(
        transport: TransportClient<Message>,
        private authToken: string | undefined,
        tracer: Tracer
    ) {
        this.connection = new PersistentConnection(transport);
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

    close(): void {
        this.connection.close();
    }
}
