import 'dotenv/config';
import './instrumentation.js';

import Router from '@koa/router';
import {createHash, randomBytes} from 'crypto';
import helmet from 'helmet';
import {createServer} from 'http';
import jwt from 'jsonwebtoken';
import Koa from 'koa';
import koaConnect from 'koa-connect';
import {
    AppError,
    assertDefined,
    CancelledError,
    context,
    CoordinatorServer,
    type CryptoService,
    decodeNumber,
    Deferred,
    encodeNumber,
    ENVIRONMENT,
    getGoogleUser,
    InstrumentedEmailService,
    InstrumentedKvStore,
    InstrumentedTransportServer,
    type JwtPayload,
    type JwtService,
    type KvStore,
    KvStoreIsolator,
    log,
    MsgpackCodec,
    toError,
    toStream,
    TupleStore,
} from 'syncwave-data';
import type {Tuple} from '../../data/dist/esm/src/tuple.js';
import {FsObjectStore} from './fs-object-store.js';
import {SesEmailService} from './ses-email-service.js';
import {WsTransportServer} from './ws-transport-server.js';

const FORCE_FOUNDATIONDB = process.env.FORCE_FOUNDATIONDB === 'true';
const STAGE = assertDefined(process.env.STAGE);
const AWS_REGION = assertDefined(process.env.AWS_DEFAULT_REGION);
const JWT_SECRET = assertDefined(process.env.JWT_SECRET);
const GOOGLE_CLIENT_ID = assertDefined(process.env.GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = assertDefined(process.env.GOOGLE_CLIENT_SECRET);

const PORT = ENVIRONMENT === 'prod' ? 80 : 4567;

const {APP_URL, GOOGLE_REDIRECT_URL, LOG_LEVEL} = (() => {
    const GOOGLE_CALLBACK_PATH = '/callbacks/google';
    if (STAGE === 'dev') {
        return {
            LOG_LEVEL: 'info' as const,
            APP_URL: 'https://dev.syncwave.dev',
            GOOGLE_REDIRECT_URL:
                'https://api-dev.syncwave.dev' + GOOGLE_CALLBACK_PATH,
        };
    } else if (STAGE === 'prod') {
        return {
            LOG_LEVEL: 'info' as const,
            APP_URL: 'https://syncwave.dev',
            GOOGLE_REDIRECT_URL:
                'https://api.syncwave.dev' + GOOGLE_CALLBACK_PATH,
        };
    } else if (STAGE === 'local') {
        return {
            LOG_LEVEL: 'error' as const,
            APP_URL: 'http://localhost:5173',
            GOOGLE_REDIRECT_URL: 'http://localhost:4567' + GOOGLE_CALLBACK_PATH,
        };
    } else {
        throw new AppError(`unknown STAGE: ${STAGE}`);
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
                    return reject({token, err});
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

async function getKVStore(): Promise<KvStore<Tuple, Uint8Array>> {
    const store = await (async () => {
        if (STAGE === 'local' && !FORCE_FOUNDATIONDB) {
            log.info('using PostgreSQL as primary store');
            return await import('./postgres-kv-store.js').then(
                x =>
                    new x.PostgresUint8KvStore({
                        connectionString:
                            'postgres://postgres:123456Qq@127.0.0.1:5440/syncwave_dev',
                        max: 20,
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 2000,
                    })
            );
        } else {
            log.info(
                `using FoundationDB as a primary store (${`./fdb/fdb.${STAGE}.cluster`}`
            );
            const fdbStore = await import('./fdb-kv-store.js').then(
                x =>
                    new x.FoundationDBUint8KvStore(`./fdb/fdb.${STAGE}.cluster`)
            );
            return fdbStore;
        }
    })();

    return new InstrumentedKvStore(
        new KvStoreIsolator(new TupleStore(store), ['sw', STAGE])
    );
}

async function upgradeKVStore(kvStore: KvStore<Tuple, Uint8Array>) {
    const versionKey = ['version'];
    log.info('Retrieving KV store version...');
    const version = await kvStore.transact(async tx => {
        log.info('Running tx.get(versionKey)...');
        const version = await tx.get(versionKey);
        if (version) {
            return decodeNumber(version);
        } else {
            return 0;
        }
    });
    log.info('KV store version: ' + version);

    if (!version || version === 1) {
        log.info("KV store doesn't have a version, upgrading...");
        await kvStore.transact(async tx => {
            const keys = await toStream(tx.query({gte: []}))
                .map(entry => entry.key)
                .toArray();

            log.info(`Store has ${keys.length} keys, removing them...`);

            if (keys.length > 1000) {
                throw new AppError('too many keys to truncate the database');
            }

            for (const key of keys) {
                await tx.delete(key);
            }

            log.info('Set KV store version to 1...');
            await tx.put(versionKey, encodeNumber(2));
        });
    }
}

async function launch() {
    const kvStore = await getKVStore();
    log.info('Upgrading KV store...');
    await upgradeKVStore(kvStore);
    log.info('Successfully upgraded KV store');

    const router = new Router();
    router.use(async (ctx, next) => {
        await context().runChild(
            {
                span: 'http request',
                attributes: {
                    method: ctx.method,
                    path: ctx.path,
                    querystring: ctx.querystring,
                    ip: ctx.ip,
                    host: ctx.host,
                    protocol: ctx.protocol,
                },
            },
            async () => {
                await next();
            }
        );
    });
    setupRouter(() => coordinator, router);

    const app = new Koa();
    app.use(router.routes()).use(router.allowedMethods());
    app.use(koaConnect(helmet()));

    const httpServer = createServer(app.callback());

    const coordinator = new CoordinatorServer({
        transport: new InstrumentedTransportServer(
            new WsTransportServer({
                codec: new MsgpackCodec(),
                server: httpServer,
            })
        ),
        kv: kvStore,
        jwt: jwtService,
        crypto,
        email: new InstrumentedEmailService(new SesEmailService(AWS_REGION)),
        jwtSecret: JWT_SECRET,
        objectStore: await FsObjectStore.create({
            basePath: './dev-object-store',
        }),
    });

    async function shutdown() {
        log.info('shutting down...');
        coordinator.close('shutdown');
        log.info('coordinator is closed');
        httpServer.close();

        // eslint-disable-next-line n/no-process-exit
        process.exit(0);
    }

    context().onEnd(() => {
        shutdown().catch(error => {
            log.error(toError(error), 'failed to shutdown');
        });
    });

    const serverStarted = new Deferred<void>();
    httpServer.listen(PORT, () => serverStarted.resolve());
    await coordinator.launch();

    return await serverStarted.promise;
}

function setupRouter(coordinator: () => CoordinatorServer, router: Router) {
    router.get('/callbacks/google', async request => {
        try {
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
                log.warn(
                    `Google user has unverified email: ${result.user.email}`
                );
                return request.redirect(`${APP_URL}/auth/log-in/failed`);
            }

            const jwtToken = await coordinator().issueJwtByUserEmail({
                email: result.user.email,
                fullName: (result.user.displayName as string) ?? 'Anonymous',
            });
            const jwtTokenComponent = encodeURIComponent(jwtToken);
            const redirectUrlComponent = encodeURIComponent(
                JSON.parse(decodeURIComponent(state as string)).redirectUrl ??
                    ''
            );

            return request.redirect(
                `${APP_URL}/auth/log-in/callback/?redirectUrl=${redirectUrlComponent}&token=${jwtTokenComponent}`
            );
        } catch (error) {
            log.error(toError(error), 'failed to handle google callback');
            return request.redirect(`${APP_URL}/auth/log-in/failed`);
        }
    });
}

log.setLogLevel(LOG_LEVEL);

const [serverCtx, cancelServerCtx] = context().createChild({
    span: 'server main',
});

process.once('SIGINT', () => cancelServerCtx(new AppError('server shutdown')));
process.once('SIGTERM', () => cancelServerCtx(new AppError('server shutdown')));
process.on('unhandledRejection', reason => {
    if (reason instanceof CancelledError) {
        log.info('unhandled cancellation');
        return;
    }

    log.error(toError(reason), 'unhandled rejection');
});

log.info('launching coordinator...');

serverCtx
    .run(async () => {
        try {
            await launch();
            log.info(`coordinator is running on port ${PORT}`);
        } catch (err) {
            log.error(toError(err), 'failed to launch coordinator');
        }
    })
    .catch(error => {
        log.error(error, 'error during launch');
    });
