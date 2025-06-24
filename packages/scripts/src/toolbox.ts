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
    const result = await client.rpc.getMeViewData({}).first();

    console.log(result);
}

catchConnectionClosed(main()).finally(() => {
    console.log('end of main');
    client.close('end of main');
});
