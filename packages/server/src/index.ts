import 'dotenv/config';

import Router from '@koa/router';
import {createHash, randomBytes} from 'crypto';
import {
    assertDefined,
    ConsoleLogger,
    Coordinator,
    CryptoService,
    Deferred,
    ENVIRONMENT,
    getGoogleUser,
    JwtPayload,
    JwtService,
    MsgpackrCodec,
    PrefixedKVStore,
    Uint8KVStore,
} from 'ground-data';
import {createServer} from 'http';
import jwt from 'jsonwebtoken';
import Koa from 'koa';
import {SesEmailService} from './ses-email-service.js';
import {WsTransportServer} from './ws-transport-server.js';

const STAGE = assertDefined(process.env.STAGE);
const AWS_REGION = assertDefined(process.env.AWS_DEFAULT_REGION);
const JWT_SECRET = assertDefined(process.env.JWT_SECRET);
const GOOGLE_CLIENT_ID = assertDefined(process.env.GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = assertDefined(process.env.GOOGLE_CLIENT_SECRET);

const PORT = ENVIRONMENT === 'prod' ? 80 : 4567;

const {APP_URL, GOOGLE_REDIRECT_URL} = (() => {
    const GOOGLE_CALLBACK_PATH = '/callbacks/google';
    if (STAGE === 'dev') {
        return {
            APP_URL: 'https://www-ground-dev.edme.io',
            GOOGLE_REDIRECT_URL: 'https://api-ground-dev.edme.io' + GOOGLE_CALLBACK_PATH,
        };
    } else if (STAGE === 'prod') {
        return {
            APP_URL: 'https://www-ground.edme.io',
            GOOGLE_REDIRECT_URL: 'https://api-ground.edme.io' + GOOGLE_CALLBACK_PATH,
        };
    } else if (STAGE === 'local') {
        return {
            APP_URL: 'http://localhost:5173',
            GOOGLE_REDIRECT_URL: 'http://localhost:4567' + GOOGLE_CALLBACK_PATH,
        };
    } else {
        throw new Error(`unknown STAGE: ${STAGE}`);
    }
})();

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

const jwtService: JwtService = {
    verify: (token, secret) =>
        new Promise((resolve, reject) => {
            jwt.verify(token, secret, (err, result) => {
                if (err) {
                    return reject(err);
                }

                resolve(result as JwtPayload);
            });
        }),
    sign: (payload, secret) =>
        new Promise((resolve, reject) => {
            jwt.sign(payload, secret, (err, result) => {
                if (err) return reject(err);
                resolve(result!);
            });
        }),
};

async function getKVStore(): Promise<Uint8KVStore> {
    if (STAGE === 'local') {
        console.log('using SQLite as primary store');
        return await import('./sqlite-kv-store.js').then(x => new x.SqliteUint8KVStore('./dev.sqlite'));
    } else {
        console.log('using FoundationDB as a primary store');
        const fdbStore = await import('./fdb-kv-store.js').then(
            x => new x.FoundationDBUint8KVStore(`./fdb.${STAGE}.cluster`)
        );
        return new PrefixedKVStore(fdbStore, `/ground-${STAGE}/`);
    }
}

async function launch() {
    const kvStore = await getKVStore();

    const router = new Router();
    setupRouter(() => coordinator, router);

    const app = new Koa();
    app.use(router.routes()).use(router.allowedMethods());

    const httpServer = createServer(app.callback());

    const coordinator = new Coordinator(
        new WsTransportServer({
            codec: new MsgpackrCodec(),
            logger: new ConsoleLogger(),
            server: httpServer,
        }),
        kvStore,
        jwtService,
        crypto,
        new SesEmailService(AWS_REGION),
        JWT_SECRET
    );

    process.once('SIGINT', () => coordinator.close());

    const serverStarted = new Deferred<void>();
    httpServer.listen(PORT, () => serverStarted.resolve());
    await coordinator.launch();

    return await serverStarted.promise;
}

function setupRouter(coordinator: () => Coordinator, router: Router) {
    router.get('/callbacks/google', async ctx => {
        const {code, state} = ctx.query;

        if (typeof code !== 'string') {
            return ctx.redirect(`${APP_URL}/log-in/failed`);
        }

        const result = await getGoogleUser(code, {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            redirectUri: GOOGLE_REDIRECT_URL,
        });
        if (result.type === 'error') {
            return ctx.redirect(`${APP_URL}/log-in/failed`);
        }

        if (!result.user.verified_email || !result.user.email) {
            console.warn(`Google user has unverified email: ${result.user.email}`);
            return ctx.redirect(`${APP_URL}/log-in/failed`);
        }

        const jwtToken = await coordinator().issueJwtByUserEmail(result.user.email);
        const jwtTokenComponent = encodeURIComponent(jwtToken);
        const redirectUrlComponent = encodeURIComponent(
            JSON.parse(decodeURIComponent(state as string)).redirectUrl ?? ''
        );

        return ctx.redirect(
            `${APP_URL}/log-in/callback/?redirectUrl=${redirectUrlComponent}&token=${jwtTokenComponent}`
        );
    });
}

launch()
    .then(() => {
        console.log(`coordinator is running on port ${PORT}`);
    })
    .catch(err => {
        console.error(err);
    });
