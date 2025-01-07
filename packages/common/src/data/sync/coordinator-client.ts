import {type CoordinatorApi} from './coordinator';
import {createRpcClient} from './rpc';
import {Connection} from './transport';

export class CoordinatorClient {
    private token?: string;

    constructor(private readonly connection: Connection) {}

    setAuthToken(token: string) {
        this.token = token;
    }

    get rpc(): CoordinatorApi {
        return createRpcClient(this.connection, () => ({auth: this.token}));
    }
}
