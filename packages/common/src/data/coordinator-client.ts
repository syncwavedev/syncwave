import {createRpcClient} from './communication/rpc';
import {Connection} from './communication/transport';
import {type CoordinatorApi} from './coordinator';
import {DataAccessor} from './db';

export class CoordinatorClient {
    private token?: string;

    constructor(private readonly connection: Connection) {}

    authenticate(authToken: string) {
        this.token = authToken;
    }

    get rpc(): CoordinatorApi {
        return createRpcClient<CoordinatorApi>(this.connection, () => ({auth: this.token})) satisfies DataAccessor;
    }
}
