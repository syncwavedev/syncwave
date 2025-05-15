// import '../packages/server/src/instrumentation.js';

/* eslint-disable */
import 'dotenv/config';

import {
    catchConnectionClosed,
    CoordinatorClient,
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

async function main() {
    const result = await client.rpc.getChildren({
        parent: [
            'columns',
            'd',
            'i',
            'boardId',
            '0196c8c8-8ea1-709f-9864-bebdf28734d2',
        ],
    });

    console.log(result);
}

catchConnectionClosed(main()).finally(() => {
    console.log('end of main');
    client.close('end of main');
});
