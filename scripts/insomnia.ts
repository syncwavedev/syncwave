// import '../packages/server/src/instrumentation.js';

/* eslint-disable */
import 'dotenv/config';

import {WsTransportClient} from '../packages/app/src/ws-transport-client.js';
import {MsgpackCodec} from '../packages/data/src/codec.js';
import {
    CoordinatorClient,
    createColumnId,
    PersistentConnection,
} from '../packages/data/src/index.js';

const client = new CoordinatorClient(
    new PersistentConnection(
        new WsTransportClient({
            codec: new MsgpackCodec(),
            url: 'ws://127.0.0.1:4567',
        })
    ),
    process.env.JWT_TOKEN
);

async function main() {
    const [member] = await client.rpc.getMyMembers({}).first();

    let columnId = createColumnId();

    for (const name of ['todo', 'doing', 'done']) {
        columnId = createColumnId();
        await client.rpc.createColumn({
            boardId: member.boardId,
            columnId,
            name,
            position: Math.random(),
        });
    }
}

main().finally(() => {
    client.close('end of main');
});
