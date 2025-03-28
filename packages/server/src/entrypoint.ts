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
    type Uint8KvStore,
} from 'syncwave';
import {match} from 'ts-pattern';
import type {Hub} from '../../data/dist/esm/src/transport/hub.js';
import type {Tuple} from '../../data/dist/esm/src/tuple.js';
import {eventLoopMonitor} from './event-loop-monitor.js';
import {FsObjectStore} from './fs-object-store.js';
import {createApiRouter} from './http/api.js';
import {createMetricsRouter} from './http/metrics.js';
import {createUiRouter} from './http/ui.js';
import {NodeCryptoService} from './node-crypto-service.js';
import {NodeJwtService} from './node-jwt-service.js';
import {SesEmailService} from './ses-email-service.js';
import {WsTransportServer} from './ws-transport-server.js';

collectDefaultMetrics();

eventLoopMonitor.enable();

type Stage = 'prod' | 'dev' | 'local' | 'self_hosted';

interface Options {
    appUrl: string;
    google?: GoogleOptions;
    logLevel: LogLevel;
    workersCount: number;
    uiPath: string | undefined;
    jwtSecret: string;
    store: KvStore<Tuple, Uint8Array>;
    hub: Hub;
    emailService: EmailService;
    launchCluster: boolean;
    appPort: number;
    metricsPort: number;
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
        (stage !== 'local' && stage !== 'self_hosted') || FORCE_FOUNDATIONDB
            ? 'fdb'
            : 'sqlite'
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

    const google = getGoogleOptions(apiUrl);
    const uiPath = stage === 'self_hosted' ? './ui' : undefined;

    return {
        appUrl,
        logLevel,
        workersCount: stage === 'prod' ? cpus().length : 1,
        emailService: new SesEmailService(awsRegion),
        jwtSecret,
        uiPath,
        hub,
        store,
        google,
        launchCluster: stage !== 'local' && stage !== 'self_hosted',
        appPort: stage === 'self_hosted' ? 80 : 4567,
        metricsPort: 5678,
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
            // use a variable to prevent typescript type check
            // because this module is deleted in self-hosted docker image and never imported
            const fdbModulePath: string = './fdb-kv-store.js';
            const fdbStore: Uint8KvStore & Hub = await import(
                fdbModulePath
            ).then((x: any) => {
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
                        dbFilePath:
                            stage === 'local'
                                ? './dev.sqlite'
                                : '/data/db.sqlite',
                        concurrentReadLimit: 4,
                    })
            );
            const store = new MvccAdapter(sqliteStore);

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

    const app = new Koa();

    const apiRouter = createApiRouter(() => coordinator, {
        appUrl: options.appUrl,
        google: options.google,
    }).prefix(options.uiPath ? '/api' : '');
    app.use(apiRouter.routes());

    if (options.uiPath) {
        const uiRouter = await createUiRouter({
            staticPath: options.uiPath,
            googleClientId: options.google?.clientId,
        });
        app.use(uiRouter.routes()).use(uiRouter.allowedMethods());
    }

    const appHttpServer = createServer(app.callback());

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
    appHttpServer.listen(options.appPort, () => appServerStarted.resolve());
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
    metricsHttpServer.listen(options.metricsPort, () =>
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

if (cluster.isPrimary && options.launchCluster) {
    log.info(`Master process ${process.pid} is running`);

    serverCtx
        .run(async () => {
            try {
                await launchMetrics();
                log.info(
                    `metrics server is running on port ${options.metricsPort}`
                );
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
                log.info(`coordinator is running on port ${options.appPort}`);
            } catch (err) {
                log.error(toError(err), 'failed to launch coordinator');
            }
        })
        .catch(error => {
            log.error(error, 'error during launch');
        });
}
