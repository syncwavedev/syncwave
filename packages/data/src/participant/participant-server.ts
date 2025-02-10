import {Message} from '../transport/message.js';
import {RpcServer} from '../transport/rpc.js';
import {TransportClient, TransportServer} from '../transport/transport.js';
import {createParticipantApi, ParticipantState} from './participant-api.js';

export class ParticipantServer {
    private readonly rpcServer: RpcServer<ParticipantState>;

    constructor(params: {
        server: TransportServer<Message>;
        client: TransportClient<Message>;
    }) {
        const state = new ParticipantState(params.client);
        this.rpcServer = new RpcServer(
            params.server,
            createParticipantApi(),
            state,
            'part'
        );
    }

    async launch() {
        await this.rpcServer.launch();
    }

    close() {
        this.rpcServer.close();
    }
}
