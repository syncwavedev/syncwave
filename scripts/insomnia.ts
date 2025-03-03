// import '../packages/server/src/instrumentation.js';

/* eslint-disable */
import 'dotenv/config';

import {trace} from '@opentelemetry/api';

import {MsgpackCodec} from '../packages/data/src/codec.js';
import {
    type Card,
    Crdt,
    createCardId,
    createColumnId,
    createRichtext,
    drop,
    getNow,
    MemTransportClient,
    MemTransportServer,
    ParticipantClient,
    ParticipantServer,
    toBigFloat,
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
    const [member] = await client.rpc.getMyMembers({}).first();

    let columnId = createColumnId();

    for (const title of ['todo', 'doing', 'done']) {
        columnId = createColumnId();
        await client.rpc.createColumn({
            boardId: member.boardId,
            columnId,
            title,
            boardPosition: toBigFloat(Math.random()),
        });
    }

    for (let i = 0; i < 20; i++) {
        const cardId = createCardId();
        const card = Crdt.from<Card>({
            boardId: member.boardId,
            id: cardId,
            pk: [cardId],
            authorId: member.userId,
            createdAt: getNow(),
            deleted: false,
            counter: -1,
            columnId,
            text: createRichtext(),
            updatedAt: getNow(),
            columnPosition: toBigFloat(Math.random()),
        });
        await client.rpc.createCard({
            diff: card.state(),
        });
    }
}

main().finally(() => {
    part.close('end of main');
});
