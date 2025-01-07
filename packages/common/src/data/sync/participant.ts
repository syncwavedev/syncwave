import {z} from 'zod';
import {rpc, service} from './rpc';

export class Participant {
    constructor() {}
}

function createParticipantRpc() {
    return service({
        echo: rpc({
            schema: z.object({message: z.string()}),
            handle: async ({message}) => ({message}),
        }),
    });
}

export type ParticipantRpc = ReturnType<typeof createParticipantRpc>;
