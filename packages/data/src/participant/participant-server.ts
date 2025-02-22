import {tracerManager} from '../tracer-manager.js';
import {RpcServer} from '../transport/rpc.js';
import type {TransportClient, TransportServer} from '../transport/transport.js';
import {createParticipantApi, ParticipantState} from './participant-api.js';

export class ParticipantServer {
    private readonly rpcServer: RpcServer<ParticipantState>;

    constructor(params: {
        server: TransportServer<unknown>;
        client: TransportClient<unknown>;
    }) {
        const state = new ParticipantState(params.client);
        this.rpcServer = new RpcServer(
            params.server,
            createParticipantApi(),
            state,
            'part',
            tracerManager.get('part')
        );
    }

    async launch() {
        await this.rpcServer.launch();
    }

    close(reason: unknown) {
        this.rpcServer.close(reason);
    }
}
