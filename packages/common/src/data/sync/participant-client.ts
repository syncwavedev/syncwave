import {unimplemented} from '../../utils';
import {type ParticipantRpc} from './participant';
import {Connection} from './transport';

export class ParticipantClient {
    constructor(connection: Connection) {}

    get rpc(): ParticipantRpc {
        return unimplemented();
    }
}
