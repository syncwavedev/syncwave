import {z} from 'zod';
import {Message} from '../communication/message.js';
import {Connection} from '../communication/transport.js';
import {createRpcClient} from '../rpc/rpc-protocol.js';
import {createApi, handler, InferRpcClient} from '../rpc/rpc.js';

export class ParticipantClient {
    constructor(private readonly connection: Connection<Message>) {}

    get rpc(): ParticipantRpc {
        return createRpcClient(participantApi, this.connection, () => ({}));
    }
}

export const participantApi = createApi<{}>()({
    echo: handler({
        req: z.object({message: z.string()}),
        res: z.object({message: z.string()}),
        handle: async (ctx, _, {message}) => ({message}),
    }),
});

export type ParticipantRpc = InferRpcClient<typeof participantApi>;
