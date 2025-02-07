import {createTraceId} from '../context.js';
import {Message} from '../transport/message.js';
import {PersistentConnection} from '../transport/persistent-connection.js';
import {createRpcClient} from '../transport/rpc.js';
import {Connection, TransportClient} from '../transport/transport.js';
import {createParticipantApi, ParticipantRpc} from './participant-api.js';

export class ParticipantClient {
    private readonly connection: Connection<Message>;
    public readonly rpc: ParticipantRpc;

    constructor(
        transport: TransportClient<Message>,
        private readonly authToken: string | undefined
    ) {
        this.connection = new PersistentConnection(transport);
        this.rpc = createRpcClient(
            createParticipantApi(),
            this.connection,
            () => ({
                auth: this.authToken,
                traceId: createTraceId(),
            }),
            true
        );
    }

    close(): void {
        this.connection.close();
    }
}
