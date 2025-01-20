import 'dotenv/config';

import {createHash, randomBytes} from 'crypto';
import {
    assertDefined,
    ConsoleLogger,
    Coordinator,
    CryptoService,
    ENVIRONMENT,
    JwtPayload,
    JwtService,
    MsgpackrCodec,
    PrefixedKVStore,
    Uint8KVStore,
} from 'ground-data';
import jwt from 'jsonwebtoken';
import {SesEmailService} from './ses-email-service.js';
import {WsTransportServer} from './ws-transport-server.js';

const STAGE = assertDefined(process.env.STAGE);
const AWS_REGION = assertDefined(process.env.AWS_DEFAULT_REGION);
const JWT_SECRET = assertDefined(process.env.JWT_SECRET);

const PORT = ENVIRONMENT === 'prod' ? 80 : 4567;

async function launch() {
    let kvStore: Uint8KVStore;

    if (STAGE === 'local') {
        console.log('using SQLite as primary store');
        kvStore = await import('./sqlite-kv-store.js').then(x => new x.SqliteUint8KVStore('./dev.sqlite'));
    } else {
        console.log('using FoundationDB as a primary store');
        kvStore = await import('./fdb-kv-store.js').then(x => new x.FoundationDBUint8KVStore(`./fdb.${STAGE}.cluster`));
        kvStore = new PrefixedKVStore(kvStore, `/ground-${STAGE}/`);
    }

    const jwtService: JwtService = {
        verify: (token, secret) => jwt.verify(token, secret) as JwtPayload,
        sign: (payload, secret) => jwt.sign(payload, secret),
    };

    const crypto: CryptoService = {
        sha256: text => createHash('sha256').update(text).digest('hex'),
        randomBytes: (size: number): Promise<Uint8Array> => {
            return new Promise((resolve, reject) => {
                try {
                    randomBytes(size, (error, buffer) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        const randomNumbers = new Uint8Array(buffer); // Convert the buffer to an array of numbers
                        resolve(randomNumbers);
                    });
                } catch (error) {
                    reject(error);
                }
            });
        },
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
        new SesEmailService(AWS_REGION),
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
