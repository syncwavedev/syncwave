import {createRpcClient} from './communication/rpc';
import {Connection} from './communication/transport';
import {type CoordinatorApi} from './coordinator';

export class ParticipantClient {
    constructor(private readonly connection: Connection) {}

    get rpc(): CoordinatorApi {
        return createRpcClient(this.connection, () => ({}));
    }
}
