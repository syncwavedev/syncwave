import {type CoordinatorApi} from './coordinator';
import {createRpcClient} from './rpc';
import {Connection} from './transport';

export class ParticipantClient {
    constructor(private readonly connection: Connection) {}

    get rpc(): CoordinatorApi {
        return createRpcClient(this.connection, () => ({}));
    }
}
