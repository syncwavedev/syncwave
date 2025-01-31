import 'dotenv/config';

import Router from '@koa/router';
import {createHash, randomBytes} from 'crypto';
import {
    AppError,
    assertDefined,
    astream,
    CoordinatorServer,
    CryptoService,
    Cx,
    decodeNumber,
    Deferred,
    encodeNumber,
    encodeString,
    ENVIRONMENT,
    getGoogleUser,
    JwtPayload,
    JwtService,
    logger,
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

const cx = Cx.background();

const STAGE = assertDefined(cx, process.env.STAGE);
const AWS_REGION = assertDefined(cx, process.env.AWS_DEFAULT_REGION);
const JWT_SECRET = assertDefined(cx, process.env.JWT_SECRET);
const GOOGLE_CLIENT_ID = assertDefined(cx, process.env.GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = assertDefined(
    cx,
    process.env.GOOGLE_CLIENT_SECRET
);

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
        throw new AppError(cx, `unknown STAGE: ${STAGE}`);
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
        logger.info(cx, 'using SQLite as primary store');
        return await import('./sqlite-kv-store.js').then(
            x => new x.SqliteUint8KVStore('./dev.sqlite')
        );
    } else {
        logger.info(cx, 'using FoundationDB as a primary store');
        const fdbStore = await import('./fdb-kv-store.js').then(
            x => new x.FoundationDBUint8KVStore(`./fdb/fdb.${STAGE}.cluster`)
        );
        return new PrefixedKVStore(cx, fdbStore, `/ground-${STAGE}/`);
    }
}

async function upgradeKVStore(upgradeCx: Cx, kvStore: Uint8KVStore) {
    const versionKey = encodeString(cx, 'version');
    const version = await kvStore.transact(upgradeCx, async (txCx, tx) => {
        const ver = await tx.get(txCx, versionKey);
        if (ver) {
            return decodeNumber(cx, ver);
        } else {
            return 0;
        }
    });

    if (!version) {
        await kvStore.transact(upgradeCx, async (cx, tx) => {
            const keys = await astream(tx.query(cx, {gte: new Uint8Array()}))
                .map((cx, entry) => entry.key)
                .toArray();

            if (keys.length > 1000) {
                throw new AppError(
                    cx,
                    'too many keys to truncate the database'
                );
            }

            for (const key of keys) {
                await tx.delete(cx, key);
            }

            await tx.put(cx, versionKey, encodeNumber(cx, 1));
        });
    }
}

async function launch(launchCx: Cx) {
    const kvStore = await getKVStore();
    await upgradeKVStore(launchCx, kvStore);

    const router = new Router();
    setupRouter(() => coordinator, router);

    const app = new Koa();
    app.use(router.routes()).use(router.allowedMethods());

    const httpServer = createServer(app.callback());

    const coordinator = new CoordinatorServer(
        cx,
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
        logger.info(cx, 'shutting down...');
        await coordinator.close(cx);
        logger.info(cx, 'coordinator is closed');
        const httpServerCloseSignal = new Deferred<void>();
        httpServer.on('close', () => httpServerCloseSignal.resolve(cx));
        httpServer.close();

        await httpServerCloseSignal.promise;

        // wait one event loop cycle for resources to clean up
        await wait(Cx.todo(), 0);

        const activeResources = process
            .getActiveResourcesInfo()
            .filter(x => x !== 'TTYWrap');
        if (activeResources.length > 0) {
            logger.error(
                cx,
                'failed to gracefully shutdown, active resources:',
                activeResources
            );
        }
    }

    launchCx.onCancel(() => {
        shutdown().catch(error => {
            logger.error(cx, 'failed to shutdown', error);
        });
    });

    const serverStarted = new Deferred<void>();
    httpServer.listen(PORT, () => serverStarted.resolve(cx));
    await coordinator.launch(cx);

    return await serverStarted.promise;
}

function setupRouter(coordinator: () => CoordinatorServer, router: Router) {
    router.get('/callbacks/google', async request => {
        const {code, state} = request.query;

        if (typeof code !== 'string') {
            return request.redirect(`${APP_URL}/log-in/failed`);
        }

        const result = await getGoogleUser(code, {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            redirectUri: GOOGLE_REDIRECT_URL,
        });
        if (result.type === 'error') {
            return request.redirect(`${APP_URL}/log-in/failed`);
        }

        if (!result.user.verified_email || !result.user.email) {
            logger.warn(
                cx,
                `Google user has unverified email: ${result.user.email}`
            );
            return request.redirect(`${APP_URL}/log-in/failed`);
        }

        const jwtToken = await coordinator().issueJwtByUserEmail(
            Cx.todo(),
            result.user.email
        );
        const jwtTokenComponent = encodeURIComponent(jwtToken);
        const redirectUrlComponent = encodeURIComponent(
            JSON.parse(decodeURIComponent(state as string)).redirectUrl ?? ''
        );

        return request.redirect(
            `${APP_URL}/log-in/callback/?redirectUrl=${redirectUrlComponent}&token=${jwtTokenComponent}`
        );
    });
}

const [mainCx, cancelMain] = Cx.background().withCancel();

process.once('SIGINT', () => cancelMain());
process.once('SIGTERM', () => cancelMain());

launch(mainCx)
    .then(() => {
        logger.info(cx, `coordinator is running on port ${PORT}`);
    })
    .catch(err => {
        logger.error(cx, '', err);
    });
