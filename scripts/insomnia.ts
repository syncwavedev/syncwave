/* eslint-disable */
import 'dotenv/config';

import {MsgpackCodec} from '../packages/data/src/codec.js';
import {
    drop,
    MemTransportClient,
    MemTransportServer,
    ParticipantClient,
    ParticipantServer,
} from '../packages/data/src/index.js';
import {WsTransportClient} from '../packages/web/src/ws-transport-client.js';

const partTransportClient = new WsTransportClient({
    codec: new MsgpackCodec(),
    url: 'ws://127.0.0.1:4567',
});
const partTransportServer = new MemTransportServer(new MsgpackCodec());
const part = new ParticipantServer({
    client: partTransportClient,
    server: partTransportServer,
});

drop(part.launch());

const client = new ParticipantClient(
    new MemTransportClient(partTransportServer, new MsgpackCodec()),
    process.env.JWT_TOKEN
);

async function main() {
    const me = await client.rpc.getMe({}).first();
    console.log('me', me);
}

main().finally(() => {
    part.close();
});
