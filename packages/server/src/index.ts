import 'dotenv/config';

import Router from '@koa/router';
import {createHash, randomBytes} from 'crypto';
import {createServer} from 'http';
import jwt from 'jsonwebtoken';
import Koa from 'koa';
import {
    assertDefined,
    CancelledError,
    context,
    CoordinatorServer,
    CryptoService,
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
    toStream,
    Uint8KVStore,
} from 'syncwave-data';
import {SesEmailService} from './ses-email-service.js';
import {WsTransportServer} from './ws-transport-server.js';

const FORCE_FOUNDATIONDB = process.env.FORCE_FOUNDATIONDB === 'true';
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
            APP_URL: 'https://www-syncwave-dev.edme.io',
            GOOGLE_REDIRECT_URL:
                'https://api-syncwave-dev.edme.io' + GOOGLE_CALLBACK_PATH,
        };
    } else if (STAGE === 'prod') {
        return {
            APP_URL: 'https://www-syncwave.edme.io',
            GOOGLE_REDIRECT_URL:
                'https://api-syncwave.edme.io' + GOOGLE_CALLBACK_PATH,
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
    if (STAGE === 'sqlite') {
        logger.info('using SQLite as primary store');
        return await import('./sqlite-kv-store.js').then(
            x => new x.SqliteUint8KVStore('./dev.sqlite')
        );
    } else if (STAGE === 'local' && !FORCE_FOUNDATIONDB) {
        logger.info('using PostgreSQL as primary store');
        return await import('./postgres-kv-store.js').then(
            x =>
                new x.PostgresUint8KVStore({
                    connectionString:
                        'postgres://postgres:123456Qq@127.0.0.1:5440/syncwave_dev',
                    max: 20,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                })
        );
    } else {
        logger.info('using FoundationDB as a primary store');
        const fdbStore = await import('./fdb-kv-store.js').then(
            x => new x.FoundationDBUint8KVStore(`./fdb/fdb.${STAGE}.cluster`)
        );
        return new PrefixedKVStore(fdbStore, `/syncwave-${STAGE}/`);
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
            const keys = await toStream(tx.query({gte: new Uint8Array()}))
                .map(entry => entry.key)
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

    const coordinator = new CoordinatorServer(
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
        logger.info('shutting down...');
        coordinator.close();
        logger.info('coordinator is closed');
        httpServer.close();

        const activeResources = process
            .getActiveResourcesInfo()
            .filter(x => x !== 'TTYWrap');
        if (activeResources.length > 0) {
            logger.error(
                'failed to gracefully shutdown, active resources:',
                activeResources
            );
        } else {
            logger.info('finishing...');
        }

        // eslint-disable-next-line n/no-process-exit
        process.exit(0);
    }

    context().onCancel(() => {
        shutdown().catch(error => {
            logger.error('failed to shutdown', error);
        });
    });

    const serverStarted = new Deferred<void>();
    httpServer.listen(PORT, () => serverStarted.resolve());
    await coordinator.launch();

    return await serverStarted.promise;
}

function setupRouter(coordinator: () => CoordinatorServer, router: Router) {
    router.get('/callbacks/google', async request => {
        const {code, state} = request.query;

        if (typeof code !== 'string') {
            return request.redirect(`${APP_URL}/auth/log-in/failed`);
        }

        const result = await getGoogleUser(code, {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            redirectUri: GOOGLE_REDIRECT_URL,
        });
        if (result.type === 'error') {
            return request.redirect(`${APP_URL}/auth/log-in/failed`);
        }

        if (!result.user.verified_email || !result.user.email) {
            logger.warn(
                `Google user has unverified email: ${result.user.email}`
            );
            return request.redirect(`${APP_URL}/auth/log-in/failed`);
        }

        const jwtToken = await coordinator().issueJwtByUserEmail(
            result.user.email
        );
        const jwtTokenComponent = encodeURIComponent(jwtToken);
        const redirectUrlComponent = encodeURIComponent(
            JSON.parse(decodeURIComponent(state as string)).redirectUrl ?? ''
        );

        return request.redirect(
            `${APP_URL}/auth/log-in/callback/?redirectUrl=${redirectUrlComponent}&token=${jwtTokenComponent}`
        );
    });
}

const [serverCtx, cancelServerCtx] = context().createChild();

process.once('SIGINT', () => cancelServerCtx());
process.once('SIGTERM', () => cancelServerCtx());
process.on('unhandledRejection', reason => {
    if (reason instanceof CancelledError) {
        logger.info('unhandled cancellation');
        return;
    }

    logger.error('unhandled rejection', reason);
});

serverCtx
    .run(async () => {
        try {
            await launch();
            logger.info(`coordinator is running on port ${PORT}`);
        } catch (err) {
            logger.error('', err);
        }
    })
    .catch(error => {
        logger.error('error during launch', error);
    });
