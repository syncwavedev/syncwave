import '../packages/server/src/instrumentation.js';

/* eslint-disable */
import 'dotenv/config';

import {trace} from '@opentelemetry/api';

import {MsgpackCodec} from '../packages/data/src/codec.js';
import {
    Crdt,
    drop,
    MemTransportClient,
    MemTransportServer,
    ParticipantClient,
    ParticipantServer,
    stringifyCrdtDiff,
    whenAll,
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
    process.env.JWT_TOKEN,
    trace.getTracer('insomnia')
);

async function main() {
    const me = await client.rpc.getMe({}).first();
    console.log('me', me);

    let board = await client.rpc.getBoard({key: 'FIRST'}).first();
    const crdt = Crdt.load(board.state);

    await client.rpc.applyBoardDiff({
        boardId: board.id,
        diff: stringifyCrdtDiff(
            crdt.update(x => {
                x.name = 'start';
            })!
        ),
    });
    board = await client.rpc.getBoard({key: 'FIRST'}).first();
    console.log('\n\ninitial name:', board.name, '\n\n');
    const diff1 = crdt.update(x => {
        x.name = 'test';
    });
    const diff2 = crdt.update(x => {
        x.name = 'test2';
    });

    await whenAll([
        client.rpc.applyBoardDiff({
            boardId: board.id,
            diff: stringifyCrdtDiff(diff1!),
        }),
        client.rpc.applyBoardDiff({
            boardId: board.id,
            diff: stringifyCrdtDiff(diff2!),
        }),
    ]);

    const board2 = await client.rpc.getBoard({key: 'FIRST'}).first();

    console.log('\n\nnew name:', board2.name, '\n\n');
}

main().finally(() => {
    part.close();
});
