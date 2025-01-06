import {z} from 'zod';
import {Uint8KVStore} from '../../kv/kv-store';
import {unimplemented} from '../../utils';
import {rpc, service} from './rpc';
import {Connection, TransportServer} from './transport';

export class Leader {
    constructor(
        private readonly transport: TransportServer,
        private readonly kv: Uint8KVStore
    ) {}

    launch(): Promise<void> {
        unimplemented();
    }
}

function createLeaderRpc() {
    return service({
        getUser: rpc({
            schema: z.object({id: z.string()}),
            handle: ({id}) => Promise.resolve(id),
        }),
    });
}

export type LeaderRpc = ReturnType<typeof createLeaderRpc>;

export class LeaderClient {
    constructor(connection: Connection) {}

    get rpc(): LeaderRpc {
        return unimplemented();
    }
}
