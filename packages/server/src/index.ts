import 'dotenv/config';

import Router from '@koa/router';
import {createHash, randomBytes} from 'crypto';
import {
    assertDefined,
    astream,
    Coordinator,
    CryptoService,
    decodeNumber,
    Deferred,
    encodeNumber,
    encodeString,
    ENVIRONMENT,
    getGoogleUser,
    JwtPayload,
    JwtService,
    MsgpackCodec,
    PrefixedKVStore,
    Uint8KVStore,
    wait,
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
            GOOGLE_REDIRECT_URL:
                'https://api-ground-dev.edme.io' + GOOGLE_CALLBACK_PATH,
        };
    } else if (STAGE === 'prod') {
        return {
            APP_URL: 'https://www-ground.edme.io',
            GOOGLE_REDIRECT_URL:
                'https://api-ground.edme.io' + GOOGLE_CALLBACK_PATH,
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
        console.log('[INF] using SQLite as primary store');
        return await import('./sqlite-kv-store.js').then(
            x => new x.SqliteUint8KVStore('./dev.sqlite')
        );
    } else {
        console.log('[INF] using FoundationDB as a primary store');
        const fdbStore = await import('./fdb-kv-store.js').then(
            x => new x.FoundationDBUint8KVStore(`./fdb/fdb.${STAGE}.cluster`)
        );
        return new PrefixedKVStore(fdbStore, `/ground-${STAGE}/`);
    }
}

async function upgradeKVStore(kvStore: Uint8KVStore) {
    const versionKey = encodeString('version');
    const version = await kvStore.transact(async tx => {
        const ver = await tx.get(versionKey);
        if (ver) {
            return decodeNumber(ver);
        } else {
            return 0;
        }
    });

    if (!version) {
        await kvStore.transact(async tx => {
            const keys = await astream(tx.query({gte: new Uint8Array()}))
                .mapParallel(x => x.key)
                .toArray();

            if (keys.length > 1000) {
                throw new Error('too many keys to truncate the database');
            }

            for (const key of keys) {
                await tx.delete(key);
            }

            await tx.put(versionKey, encodeNumber(1));
        });
    }
}

async function launch() {
    const kvStore = await getKVStore();
    await upgradeKVStore(kvStore);

    const router = new Router();
    setupRouter(() => coordinator, router);

    const app = new Koa();
    app.use(router.routes()).use(router.allowedMethods());

    const httpServer = createServer(app.callback());

    const coordinator = new Coordinator(
        new WsTransportServer({
            codec: new MsgpackCodec(),
            server: httpServer,
        }),
        kvStore,
        jwtService,
        crypto,
        new SesEmailService(AWS_REGION),
        JWT_SECRET
    );

    async function shutdown() {
        console.log('[INF] shutting down...');
        await coordinator.close();
        console.log('[INF] coordinator is closed');
        const httpServerCloseSignal = new Deferred<void>();
        httpServer.on('close', () => httpServerCloseSignal.resolve());
        httpServer.close();

        await httpServerCloseSignal.promise;

        // wait one event loop cycle for resources to clean up
        await wait(0);

        const activeResources = process
            .getActiveResourcesInfo()
            .filter(x => x !== 'TTYWrap');
        if (activeResources.length > 0) {
            console.error(
                '[ERR] failed to gracefully shutdown, active resources:',
                activeResources
            );
        }
    }

    process.once('SIGINT', () => shutdown());
    process.once('SIGTERM', () => shutdown());

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
            console.warn(
                `[WRN] Google user has unverified email: ${result.user.email}`
            );
            return ctx.redirect(`${APP_URL}/log-in/failed`);
        }

        const jwtToken = await coordinator().issueJwtByUserEmail(
            result.user.email
        );
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
        console.log(`[INF] coordinator is running on port ${PORT}`);
    })
    .catch(err => {
        console.error('[ERR]', err);
    });
