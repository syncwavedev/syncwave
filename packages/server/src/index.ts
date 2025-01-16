import {createHash} from 'crypto';
import {Coordinator, Crypto, JwtPayload, JwtService, MsgpackrCodec} from 'ground-data';
import jwt from 'jsonwebtoken';
import {SqliteUint8KVStore} from './sqlite-kv-store';
import {WsTransportServer} from './ws-transport-server';

const IS_DARWIN = process.platform === 'darwin';
const PORT = 4567;

// todo: read from env
const JWT_SECRET = 'test_secret';

async function launch() {
    const kvStore = await (IS_DARWIN
        ? new SqliteUint8KVStore('./dev.sqlite')
        : import('./fdb-kv-store').then(x => new x.FoundationDBUint8KVStore()));

    const jwtService: JwtService = {
        verify: (token, secret) => jwt.verify(token, secret) as JwtPayload,
        sign: (payload, secret) => jwt.sign(payload, secret),
    };

    const crypto: Crypto = {
        sha256: text => createHash('sha256').update(text).digest('hex'),
    };

    const coordinator = new Coordinator(
        new WsTransportServer({port: PORT, codec: new MsgpackrCodec()}),
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
