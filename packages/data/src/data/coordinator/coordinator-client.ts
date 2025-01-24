import {DataAccessor} from '../actor.js';
import {Message} from '../communication/message.js';
import {createRpcClient} from '../communication/rpc.js';
import {Connection} from '../communication/transport.js';
import {coordinatorApi} from './coordinator-api.js';

export class CoordinatorClient {
    private token?: string;

    constructor(private readonly connection: Connection<Message>) {}

    authenticate(authToken: string) {
        this.token = authToken;
    }

    get rpc() {
        return createRpcClient(coordinatorApi, this.connection, () => ({
            auth: this.token,
        })) satisfies DataAccessor;
    }
}
