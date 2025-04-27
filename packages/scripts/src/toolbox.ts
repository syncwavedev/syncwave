// import '../packages/server/src/instrumentation.js';

/* eslint-disable */
import 'dotenv/config';

import {
    catchConnectionClosed,
    CoordinatorClient,
    MsgpackCodec,
    PersistentConnection,
} from 'syncwave';
import {NodeCryptoProvider} from 'syncwave/node-crypto-provider.js';
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

const crypto = NodeCryptoProvider;

async function main() {
    const hash = await crypto.bcryptHash('123456');
    console.log(
        'result',
        await crypto.bcryptCompare({hash, password: '1234456'})
    );
}

catchConnectionClosed(main()).finally(() => {
    console.log('end of main');
    client.close('end of main');
});
