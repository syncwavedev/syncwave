// import '../packages/server/src/instrumentation.js';

/* eslint-disable */
import 'dotenv/config';

import {
    CoordinatorClient,
    createBoardId,
    MsgpackCodec,
    PersistentConnection,
} from 'syncwave';
import {WsTransportClient} from '../../app/src/ws-transport-client.js';

const client = new CoordinatorClient(
    new PersistentConnection(
        new WsTransportClient({
            codec: new MsgpackCodec(),
            url: 'ws://127.0.0.1:4567',
        })
    ),
    process.env.JWT_TOKEN
);

async function getMyBoard() {
    const members = await client.rpc.getMyMembers({}).first();

    console.log(members.map(x => x.board.name).join('\n'));
}

async function createMember() {
    const members = await client.rpc.getMyMembers({}).first();
    const boardId = members[0].board.id;

    await client.rpc.createMember({
        boardId,
        email: 'tilyupo@gmail.com',
        role: 'admin',
    });
}

async function createBoard() {
    await client.rpc.createBoard({
        name: 'test board #2',
        boardId: createBoardId(),
        key: 'test-new-board-2',
        members: [],
    });
}

async function main() {
    await createBoard();
}

main().finally(() => {
    client.close('end of main');
});
