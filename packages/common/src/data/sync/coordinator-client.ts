import {Db} from '../data-provider';
import {type CoordinatorApi} from './coordinator';
import {createRpcClient} from './rpc';
import {Connection} from './transport';

export class CoordinatorClient {
    private token?: string;

    constructor(private readonly connection: Connection) {}

    authenticate(authToken: string) {
        this.token = authToken;
    }

    get rpc(): CoordinatorApi {
        return createRpcClient<CoordinatorApi>(this.connection, () => ({auth: this.token})) satisfies Db;
    }
}
