import {type CoordinatorRpc} from './coordinator';
import {createRpcClient} from './rpc';
import {Connection} from './transport';

export class CoordinatorClient {
    private token?: string;

    constructor(private readonly connection: Connection) {}

    setToken(token: string) {
        this.token = token;
    }

    get rpc(): CoordinatorRpc {
        return createRpcClient(this.connection, () => ({auth: this.token}));
    }
}
