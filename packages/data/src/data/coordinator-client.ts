import {DataAccessor} from './actor.js';
import {Message} from './communication/message.js';
import {createRpcClient} from './communication/rpc.js';
import {Connection} from './communication/transport.js';
import {type CoordinatorApi} from './coordinator.js';

export class CoordinatorClient {
    private token?: string;

    constructor(private readonly connection: Connection<Message>) {}

    authenticate(authToken: string) {
        this.token = authToken;
    }

    get rpc(): CoordinatorApi {
        return createRpcClient<CoordinatorApi>(this.connection, () => ({
            auth: this.token,
        })) satisfies DataAccessor;
    }
}
