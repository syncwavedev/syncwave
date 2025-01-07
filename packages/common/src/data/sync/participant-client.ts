import {type CoordinatorRpc} from './coordinator';
import {createRpcClient} from './rpc';
import {Connection} from './transport';

export class ParticipantClient {
    constructor(private readonly connection: Connection) {}

    get rpc(): CoordinatorRpc {
        return createRpcClient(this.connection, () => ({}));
    }
}
