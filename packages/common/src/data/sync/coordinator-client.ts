import {unimplemented} from '../../utils';
import {type CoordinatorRpc} from './coordinator';
import {Connection} from './transport';

export class CoordinatorClient {
    constructor(connection: Connection) {}

    get rpc(): CoordinatorRpc {
        return unimplemented();
    }
}
