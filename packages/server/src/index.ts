import {createHash} from 'crypto';
import {
    ConsoleLogger,
    Coordinator,
    Crypto,
    ENVIRONMENT,
    JwtPayload,
    JwtService,
    MsgpackrCodec,
    PrefixedKVStore,
    STAGE,
    Uint8KVStore,
} from 'ground-data';
import jwt from 'jsonwebtoken';
import {WsTransportServer} from './ws-transport-server.js';

const PORT = ENVIRONMENT === 'prod' ? 80 : 4567;

// todo: read from env
const JWT_SECRET = 'test_secret';

async function launch() {
    let kvStore: Uint8KVStore;

    if (ENVIRONMENT === 'prod') {
        console.log('using FoundationDB as a primary store');
        kvStore = await import('./fdb-kv-store.js').then(x => new x.FoundationDBUint8KVStore());
        kvStore = new PrefixedKVStore(kvStore, `/ground-${STAGE}/`);
    } else {
        console.log('using SQLite as primary store');
        kvStore = await import('./sqlite-kv-store.js').then(x => new x.SqliteUint8KVStore('./dev.sqlite'));
    }

    const jwtService: JwtService = {
        verify: (token, secret) => jwt.verify(token, secret) as JwtPayload,
        sign: (payload, secret) => jwt.sign(payload, secret),
    };

    const crypto: Crypto = {
        sha256: text => createHash('sha256').update(text).digest('hex'),
    };

    const coordinator = new Coordinator(
        new WsTransportServer({
            port: PORT,
            codec: new MsgpackrCodec(),
            logger: new ConsoleLogger(),
        }),
        kvStore,
        jwtService,
        crypto,
        JWT_SECRET
    );

    await coordinator.launch();

    process.once('SIGINT', () => coordinator.close());
}

launch()
    .then(() => {
        console.log(`coordinator is running on port ${PORT}`);
    })
    .catch(err => {
        console.error(err);
    });
