import {Message} from './communication/message.js';
import {createRpcClient} from './communication/rpc.js';
import {Connection} from './communication/transport.js';
import {type CoordinatorApi} from './coordinator/coordinator.js';

export class ParticipantClient {
    constructor(private readonly connection: Connection<Message>) {}

    get rpc(): CoordinatorApi {
        return createRpcClient(this.connection, () => ({}));
    }
}
