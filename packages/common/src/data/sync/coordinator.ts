import {z} from 'zod';
import {Uint8KVStore} from '../../kv/kv-store';
import {assertNever} from '../../utils';
import {createMessageId} from './message';
import {rpc, service} from './rpc';
import {Connection, TransportServer} from './transport';

export class Coordinator {
    private readonly server: CoordinatorRpc;

    constructor(
        private readonly transport: TransportServer,
        private readonly kv: Uint8KVStore
    ) {
        this.transport.launch(conn => this.handleConnection(conn));
        this.server = createCoordinatorRpc();
    }

    close() {
        this.transport.close();
    }

    private handleConnection(conn: Connection): void {
        conn.subscribe(async ev => {
            if (ev.type === 'close') {
                // nothing to do
            } else if (ev.type === 'message') {
                if (ev.msg.type === 'ping') {
                    conn.send({type: 'pong', id: createMessageId(), pingId: ev.msg.id});
                } else if (ev.msg.type === 'pong') {
                    // nothing to do
                } else if (ev.msg.type === 'req') {
                    try {
                        const result = await this.server[ev.msg.payload.name](ev.msg.payload.arg);
                        await conn.send({
                            id: createMessageId(),
                            type: 'res',
                            reqId: ev.msg.id,
                            payload: {type: 'success', result},
                        });
                    } catch (err: any) {
                        console.error(err);
                        const errorMessage = typeof (err ?? {})['message'] === 'string' ? err['message'] : undefined;
                        await conn.send({
                            id: createMessageId(),
                            type: 'res',
                            reqId: ev.msg.id,
                            payload: {
                                type: 'error',
                                message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
                            },
                        });
                    }
                } else if (ev.msg.type === 'res') {
                    // nothing to do
                } else {
                    assertNever(ev.msg);
                }
            } else {
                assertNever(ev);
            }
        });
    }
}

function createCoordinatorRpc() {
    return service({
        getUser: rpc({
            schema: z.object({id: z.string()}),
            handle: ({id}) => Promise.resolve(id),
        }),
    });
}

export type CoordinatorRpc = ReturnType<typeof createCoordinatorRpc>;
