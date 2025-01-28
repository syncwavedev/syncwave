import {DataAccessor} from '../actor.js';
import {Message} from '../communication/message.js';
import {Connection} from '../communication/transport.js';
import {createRpcClient} from '../rpc/rpc-protocol.js';
import {CoordinatorRpc, createCoordinatorApi} from './coordinator-api.js';

export class CoordinatorClient {
    private token?: string;
    public readonly rpc: CoordinatorRpc;

    constructor(private readonly connection: Connection<Message>) {
        this.rpc = createRpcClient(
            createCoordinatorApi(),
            this.connection,
            () => ({
                auth: this.token,
            })
        ) satisfies DataAccessor;
    }

    authenticate(authToken: string) {
        this.token = authToken;
    }
}
