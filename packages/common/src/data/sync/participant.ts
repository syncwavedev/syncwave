import {z} from 'zod';
import {createApi, handler} from './rpc';
import {Connection} from './transport';

export class Participant {
    constructor(private readonly connection: Connection) {}
}

function createParticipantRpc() {
    return createApi({
        echo: handler({
            schema: z.object({message: z.string()}),
            handle: async ({message}) => ({message}),
        }),
    });
}

export type ParticipantRpc = ReturnType<typeof createParticipantRpc>;
