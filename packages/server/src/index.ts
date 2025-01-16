import {createHash} from 'crypto';
import {ConsoleLogger, Coordinator, Crypto, JwtPayload, JwtService, MsgpackrCodec, Uint8KVStore} from 'ground-data';
import jwt from 'jsonwebtoken';
import {SqliteUint8KVStore} from './sqlite-kv-store';
import {WsTransportServer} from './ws-transport-server';

const isProduction = process.env.NODE_ENV !== 'development';
const PORT = 4567;

// todo: read from env
const JWT_SECRET = 'test_secret';

async function launch() {
    let kvStore: Uint8KVStore;

    if (isProduction) {
        console.log('using FoundationDB as primary store');
        kvStore = await import('./fdb-kv-store').then(x => new x.FoundationDBUint8KVStore());
    } else {
        console.log('using SQLite as primary store');
        kvStore = new SqliteUint8KVStore('./dev.sqlite');
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
