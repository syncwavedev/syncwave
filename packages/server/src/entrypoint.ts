import './instrumentation.js';

import 'dotenv/config';

import cluster from 'cluster';
import {createServer} from 'http';
import Koa from 'koa';
import helmet from 'koa-helmet';
import {cpus} from 'os';
import {collectDefaultMetrics} from 'prom-client';
import {
    AppError,
    assertDefined,
    assertOneOf,
    CancelledError,
    context,
    CoordinatorServer,
    decodeNumber,
    Deferred,
    type EmailService,
    encodeNumber,
    type GoogleOptions,
    type KvStore,
    KvStoreIsolator,
    log,
    type LogLevel,
    MemHub,
    MsgpackCodec,
    MvccAdapter,
    toError,
    toStream,
    TupleStore,
} from 'syncwave';
import {match} from 'ts-pattern';
import type {Hub} from '../../data/dist/esm/src/transport/hub.js';
import type {Tuple} from '../../data/dist/esm/src/tuple.js';
import {eventLoopMonitor} from './event-loop-monitor.js';
import {FsObjectStore} from './fs-object-store.js';
import {createApiRouter} from './http/api.js';
import {createMetricsRouter} from './http/metrics.js';
import {NodeCryptoService} from './node-crypto-service.js';
import {NodeJwtService} from './node-jwt-service.js';
import {SesEmailService} from './ses-email-service.js';
import {WsTransportServer} from './ws-transport-server.js';

collectDefaultMetrics();

eventLoopMonitor.enable();

const APP_PORT = 4567;
const METRICS_PORT = 5678;

type Stage = 'prod' | 'dev' | 'local' | 'self_hosted';

interface Options {
    appUrl: string;
    google?: GoogleOptions;
    logLevel: LogLevel;
    workersCount: number;
    staticPath: string | undefined;
    apiPrefix: string;
    jwtSecret: string;
    store: KvStore<Tuple, Uint8Array>;
    hub: Hub;
    emailService: EmailService;
}

function getGoogleOptions(apiUrl: string): GoogleOptions | undefined {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    // skip if Google OAuth is not configured
    if (!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_SECRET) {
        return undefined;
    }

    return {
        clientId: assertDefined(
            GOOGLE_CLIENT_ID,
            'GOOGLE_CLIENT_ID is not required for Google OAuth'
        ),
        clientSecret: assertDefined(
            GOOGLE_CLIENT_SECRET,
            'GOOGLE_CLIENT_SECRET is not required for Google OAuth'
        ),
        redirectUri: `${apiUrl}/callbacks/google`,
    };
}

async function getOptions(): Promise<Options> {
    const FORCE_FOUNDATIONDB = process.env.FORCE_FOUNDATIONDB === 'true';
    const stage: Stage = assertOneOf(
        process.env.STAGE,
        ['prod', 'dev', 'local', 'self_hosted'] as const,
        'invalid stage'
    );
    const awsRegion = assertDefined(
        process.env.AWS_DEFAULT_REGION,
        'AWS_DEFAULT_REGION is required for SES email service'
    );
    const jwtSecret = assertDefined(
        process.env.JWT_SECRET,
        'JWT_SECRET is not required'
    );

    const {store, hub} = await getKvStore(
        stage,
        stage !== 'local' || FORCE_FOUNDATIONDB ? 'fdb' : 'sqlite'
    );
    const logLevel = match(stage)
        .with('local', () => 'debug' as const)
        .with('dev', () => 'info' as const)
        .with('prod', () => 'info' as const)
        .with('self_hosted', () => 'info' as const)
        .exhaustive();

    const appUrl = match(stage)
        .with('local', () => 'http://localhost:5173')
        .with('dev', () => 'https://dev.syncwave.dev')
        .with('prod', () => 'https://app.syncwave.dev')
        .with('self_hosted', () => {
            let baseUrl = assertDefined(
                process.env.BASE_URL,
                'BASE_URL is required'
            );
            while (baseUrl.endsWith('/')) {
                baseUrl = baseUrl.slice(0, -1);
            }
            return baseUrl;
        })
        .exhaustive();

    const apiUrl = match(stage)
        .with('local', () => 'http://localhost:4567')
        .with('dev', () => 'https://api-dev.syncwave.dev')
        .with('prod', () => 'https://api.syncwave.dev')
        .with('self_hosted', () => `${appUrl}/api`)
        .exhaustive();

    const apiPrefix = match(stage)
        .with('local', () => '')
        .with('dev', () => '')
        .with('prod', () => '')
        .with('self_hosted', () => '/api')
        .exhaustive();

    const google = getGoogleOptions(apiUrl);
    const staticPath = stage === 'self_hosted' ? './static' : undefined;

    return {
        apiPrefix,
        appUrl,
        logLevel,
        workersCount: stage === 'prod' ? cpus().length : 1,
        emailService: new SesEmailService(awsRegion),
        jwtSecret,
        staticPath,
        hub,
        store,
        google,
    };
}

const options = await getOptions();

async function getKvStore(
    stage: string,
    type: 'fdb' | 'sqlite'
): Promise<{
    store: KvStore<Tuple, Uint8Array>;
    hub: Hub;
}> {
    const {store, hub} = await match(type)
        .with('fdb', async () => {
            log.info(
                `using FoundationDB as a primary store (./fdb/fdb.${stage}.cluster)`
            );
            const fdbStore = await import('./fdb-kv-store.js').then(x => {
                return new x.FoundationDBUint8KvStore({
                    clusterFilePath: `./fdb/fdb.${stage}.cluster`,
                    topicPrefix: '/hub/topics/',
                });
            });
            return {
                store: fdbStore,
                hub: fdbStore,
            };
        })
        .with('sqlite', async () => {
            log.info('using Sqlite as primary store');
            const sqliteStore = await import('./sqlite-store.js').then(
                x =>
                    new x.SqliteRwStore({
                        dbFilePath: './dev.sqlite',
                        concurrentReadLimit: 4,
                    })
            );
            const store = new MvccAdapter(sqliteStore);

            const storeStats = await store.stats();
            log.info(
                `SQLite MVCC stats: ${JSON.stringify(storeStats, null, 2)}`
            );

            return {
                store,
                hub: new MemHub(),
            };
        })
        .exhaustive();

    return {
        store: new KvStoreIsolator(new TupleStore(store), ['sw', stage]),
        hub,
    };
}

async function upgradeKVStore(kvStore: KvStore<Tuple, Uint8Array>) {
    const versionKey = ['version'];
    log.info('Retrieving KV store version...');
    const version = await kvStore.transact(async tx => {
        log.info('Running tx.get(versionKey)...');
        const version = await tx.get(versionKey);
        if (version) {
            try {
                return decodeNumber(version);
            } catch {
                await tx.put(versionKey, encodeNumber(2));
                return 2;
            }
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

async function launchApp(options: Options) {
    log.info('Upgrading KV store...');
    await upgradeKVStore(options.store);
    log.info('Successfully upgraded KV store');

    const api = new Koa();
    const apiRouter = createApiRouter(() => coordinator, {
        appUrl: options.appUrl,
        google: options.google,
    });
    api.use(apiRouter.routes()).use(apiRouter.allowedMethods());
    api.use(helmet.default());

    const appHttpServer = createServer(api.callback());

    const coordinator = new CoordinatorServer({
        transport: new WsTransportServer({
            codec: new MsgpackCodec(),
            server: appHttpServer,
        }),
        kv: options.store,
        jwt: NodeJwtService,
        crypto: NodeCryptoService,
        email: options.emailService,
        jwtSecret: options.jwtSecret,
        objectStore: await FsObjectStore.create({
            basePath: './dev-object-store',
        }),
        hub: options.hub,
    });

    async function shutdown() {
        log.info('shutting down app...');
        coordinator.close('shutdown');
    }

    context().onEnd(() => {
        shutdown().catch(error => {
            log.error(toError(error), 'failed to shutdown');
        });
    });

    const appServerStarted = new Deferred<void>();
    appHttpServer.listen(APP_PORT, () => appServerStarted.resolve());
    await coordinator.launch();

    await appServerStarted.promise;
}

async function launchMetrics() {
    const metrics = new Koa();
    const metricsRouter = createMetricsRouter().prefix('/metrics');
    metrics.use(metricsRouter.routes()).use(metricsRouter.allowedMethods());
    metrics.use(helmet.default());

    const metricsHttpServer = createServer(metrics.callback());

    async function shutdown() {
        log.info('shutting down metrics server...');
        metricsHttpServer.close();
    }

    context().onEnd(() => {
        shutdown().catch(error => {
            log.error(toError(error), 'failed to shutdown');
        });
    });

    const metricsServerStarted = new Deferred<void>();
    metricsHttpServer.listen(METRICS_PORT, () =>
        metricsServerStarted.resolve()
    );

    await metricsServerStarted.promise;
}

log.setLogLevel(options.logLevel);

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

if (cluster.isPrimary && options.workersCount > 1) {
    log.info(`Master process ${process.pid} is running`);

    serverCtx
        .run(async () => {
            try {
                await launchMetrics();
                log.info(`metrics server is running on port ${METRICS_PORT}`);
            } catch (err) {
                log.error(toError(err), 'failed to launch coordinator');
            }
        })
        .catch(error => {
            log.error(error, 'error during launch');
        });

    for (let i = 0; i < options.workersCount; i++) {
        const spawnWorker = () => {
            const worker = cluster.fork();
            log.info(`Spawned worker ${worker.process.pid}`);

            worker.on('exit', (code, signal) => {
                log.error(
                    `Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`
                );
                spawnWorker();
            });
        };

        for (let i = 0; i < options.workersCount; i++) {
            spawnWorker();
        }
    }
} else {
    serverCtx
        .run(async () => {
            try {
                await launchApp(options);
                log.info(`coordinator is running on port ${APP_PORT}`);
            } catch (err) {
                log.error(toError(err), 'failed to launch coordinator');
            }
        })
        .catch(error => {
            log.error(error, 'error during launch');
        });
}
