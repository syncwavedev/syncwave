import {Cx} from '../../context.js';
import {Message} from '../communication/message.js';
import {PersistentConnection} from '../communication/persistent-connection.js';
import {Connection, TransportClient} from '../communication/transport.js';
import {createRpcClient} from '../rpc/rpc-engine.js';
import {createParticipantApi, ParticipantRpc} from './participant-api.js';

export class ParticipantClient {
    private readonly connection: Connection<Message>;
    public readonly rpc: ParticipantRpc;

    constructor(
        cx: Cx,
        transport: TransportClient<Message>,
        private readonly authToken: string | undefined
    ) {
        this.connection = new PersistentConnection(transport);
        this.rpc = createRpcClient(
            createParticipantApi(cx),
            this.connection,
            () => ({
                auth: this.authToken,
            })
        );
    }

    async close(cx: Cx): Promise<void> {
        await this.connection.close(cx);
    }
}
