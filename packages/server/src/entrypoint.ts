import 'dotenv/config';

import './instrumentation.js';

import cors from '@koa/cors';
import cluster from 'cluster';
import {randomBytes} from 'crypto';
import {existsSync, readFileSync, writeFileSync} from 'fs';
import {createServer, IncomingMessage, ServerResponse} from 'http';
import type {Http2ServerRequest, Http2ServerResponse} from 'http2';
import Koa from 'koa';
import helmet from 'koa-helmet';
import {cpus} from 'os';
import path from 'path';
import {collectDefaultMetrics} from 'prom-client';
import type {EmailProvider, Hub, ObjectStore, Tuple} from 'syncwave';
import {
    AppError,
    assert,
    assertDefined,
    camelCaseToSnakeCase,
    CancelledError,
    context,
    CoordinatorServer,
    DataLayer,
    Deferred,
    type GoogleOptions,
    type KvStore,
    KvStoreIsolator,
    log,
    type LogLevel,
    MemHub,
    MsgpackCodec,
    MvccAdapter,
    TupleStore,
    type Uint8KvStore,
} from 'syncwave';
import {NodeCryptoProvider} from 'syncwave/node-crypto-provider.js';
import {NodeJwtProvider} from 'syncwave/node-jwt-provider.js';
import {match} from 'ts-pattern';
import {eventLoopMonitor} from './event-loop-monitor.js';
import {FsObjectStore} from './fs-object-store.js';
import {createApiRouter} from './http/api.js';
import {createMetricsRouter} from './http/metrics.js';
import {createUiRouter} from './http/ui.js';
import {S3ObjectStore} from './s3-object-store.js';
import {SesEmailProvider} from './ses-email-provider.js';
import {getStage, type Stage} from './stage.js';
import {WsTransportServer} from './ws-transport-server.js';

collectDefaultMetrics();

eventLoopMonitor.enable();

const stage = getStage();

interface Options {
    google: GoogleOptions | undefined;
    logLevel: LogLevel;
    workersCount: number;
    uiPath: string | undefined;
    jwtSecret: string;
    store: KvStore<Tuple, Uint8Array>;
    objectStore: ObjectStore;
    hub: Hub;
    emailProvider: EmailProvider;
    launchCluster: boolean;
    appPort: number;
    metricsPort: number;
    passwordsEnabled: boolean;
    superadmin: SuperadminOptions | undefined;
    enableMetrics: boolean;
}

function getApiUrl(params: {stage: Stage; baseUrl: string}): string {
    return match(params.stage)
        .with('local', () => 'http://localhost:4567')
        .with('dev', () => 'https://api-dev.syncwave.dev')
        .with('prod', () => 'https://api.syncwave.dev')
        .with('self', () => `${trimBaseUrl(params.baseUrl)}/api`)
        .exhaustive();
}

function getAppUrl(params: {stage: Stage; baseUrl: string}): string {
    return match(params.stage)
        .with('local', () => 'http://localhost:5173')
        .with('dev', () => 'https://dev.syncwave.dev')
        .with('prod', () => 'https://app.syncwave.dev')
        .with('self', () => trimBaseUrl(params.baseUrl))
        .exhaustive();
}

function getGoogleOptions(stage: Stage): Result<GoogleOptions | undefined> {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const BASE_URL = process.env.BASE_URL;

    // skip if Google OAuth is not configured
    if (!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_SECRET) {
        return {type: 'ok', value: undefined};
    }

    const errors: string[] = [];
    if (!GOOGLE_CLIENT_ID) {
        errors.push('GOOGLE_CLIENT_ID is required for Google OAuth');
    }
    if (!GOOGLE_CLIENT_SECRET) {
        errors.push('GOOGLE_CLIENT_SECRET is required for Google OAuth');
    }
    if (!BASE_URL) {
        errors.push('BASE_URL is required for Google OAuth');
    }
    if (errors.length) {
        return {type: 'error', errors};
    }

    assert(
        !!GOOGLE_CLIENT_ID && !!GOOGLE_CLIENT_SECRET && !!BASE_URL,
        'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and BASE_URL must be defined if Google OAuth is configured'
    );

    if (errors.length > 0) {
        return {type: 'error', errors};
    }

    const apiUrl = getApiUrl({stage, baseUrl: BASE_URL});
    const appUrl = getAppUrl({stage, baseUrl: BASE_URL});

    return {
        type: 'ok',
        value: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            redirectUri: `${apiUrl}/callbacks/google`,
            appUrl,
        },
    };
}

interface SuperadminOptions {
    email: string;
    password: string;
}

function getInstanceAdminOptions(): Result<SuperadminOptions | undefined> {
    const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
    const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
    if (!SUPERADMIN_EMAIL && !SUPERADMIN_PASSWORD) {
        return {type: 'ok', value: undefined};
    }

    const errors: string[] = [];
    if (!SUPERADMIN_EMAIL) {
        errors.push('SUPERADMIN_EMAIL is required for superadmin');
    }
    if (!SUPERADMIN_PASSWORD) {
        errors.push('SUPERADMIN_PASSWORD is required for superadmin');
    }
    if (errors.length > 0) {
        return {type: 'error', errors};
    }

    assert(
        !!SUPERADMIN_EMAIL && !!SUPERADMIN_PASSWORD,
        'SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be defined if superadmin is configured'
    );

    return {
        type: 'ok',
        value: {
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD,
        },
    };
}

const DATA_DIR = '/data';

function trimBaseUrl(baseUrl: string): string {
    while (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    return baseUrl;
}

type Result<T> = {type: 'ok'; value: T} | {type: 'error'; errors: string[]};

async function getObjectStore(stage: Stage): Promise<Result<ObjectStore>> {
    if (
        !process.env.S3_BUCKET_NAME &&
        !process.env.S3_ENDPOINT &&
        !process.env.S3_ACCESS_KEY &&
        !process.env.S3_SECRET_KEY
    ) {
        return {
            type: 'ok',
            value: await FsObjectStore.create({
                basePath:
                    stage === 'local'
                        ? './dev-object-store'
                        : path.join(DATA_DIR, 'objects'),
            }),
        };
    }

    const errors: string[] = [];
    if (!process.env.S3_BUCKET_NAME) {
        errors.push('S3_BUCKET_NAME is required');
    }
    if (!process.env.S3_ACCESS_KEY) {
        errors.push('S3_ACCESS_KEY is required');
    }
    if (!process.env.S3_SECRET_KEY) {
        errors.push('S3_SECRET_KEY is required');
    }
    if (
        process.env.S3_FORCE_PATH_STYLE &&
        process.env.S3_FORCE_PATH_STYLE !== 'true' &&
        process.env.S3_FORCE_PATH_STYLE !== 'false'
    ) {
        errors.push('S3_FORCE_PATH_STYLE must be true or false');
    }
    if (process.env.S3_KEY_PREFIX) {
        if (/[^a-zA-Z0-9_\-\/]/.test(process.env.S3_KEY_PREFIX)) {
            errors.push(
                'S3_KEY_PREFIX can only contain alphanumeric characters, underscores, dashes, and slashes'
            );
        }
        if (process.env.S3_KEY_PREFIX.length > 512) {
            errors.push('S3_KEY_PREFIX cannot be longer than 512 characters');
        }
    }
    if (errors.length > 0) {
        return {type: 'error', errors};
    }

    assert(
        !!process.env.S3_BUCKET_NAME &&
            !!process.env.S3_ACCESS_KEY &&
            !!process.env.S3_SECRET_KEY,
        'S3_BUCKET_NAME, S3_ACCESS_KEY, and S3_SECRET_KEY must be defined if S3 object store is configured'
    );

    return {
        type: 'ok',
        value: new S3ObjectStore({
            bucketName: process.env.S3_BUCKET_NAME,
            endpoint: process.env.S3_ENDPOINT,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY,
                secretAccessKey: process.env.S3_SECRET_KEY,
            },
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
            region: process.env.S3_REGION ?? 'us-east-1',
            keyPrefix: process.env.S3_KEY_PREFIX,
        }),
    };
}

function validateJwtSecret(secret: string): Result<string> {
    if (secret.length < 32) {
        return {
            type: 'error',
            errors: [
                `JWT secret must be at least 32 characters long (excluding whitespace), found ${secret.length} characters`,
            ],
        };
    }
    if (secret.length > 512) {
        return {
            type: 'error',
            errors: [
                `JWT secret cannot be longer than 512 characters (excluding whitespace), found ${secret.length} characters`,
            ],
        };
    }
    if (secret.length < 64) {
        log.warn({
            msg: 'JWT secret is less than 64 characters long, which is not recommended for security reasons (excluding whitespace)',
        });
    }
    return {
        type: 'ok',
        value: secret,
    };
}

function getJwtSecret(stage: Stage): Result<string> {
    if (process.env.SECRET_KEY) {
        const secretFromEnv = process.env.SECRET_KEY.trim();
        return validateJwtSecret(secretFromEnv);
    }

    if (stage !== 'self') {
        return {
            type: 'error',
            errors: ['SECRET_KEY is required for JWT authentication.'],
        };
    }
    const secretPath = path.join(DATA_DIR, 'secret.key');

    if (existsSync(secretPath)) {
        log.info({msg: 'Loaded existing JWT secret.'});
        const secretFromFile = readFileSync(secretPath, 'utf-8').trim();
        return validateJwtSecret(secretFromFile);
    }

    const secret = randomBytes(64).toString('hex');
    writeFileSync(secretPath, secret, {mode: 0o600});
    log.info({msg: 'Generated and saved new JWT secret.'});

    return validateJwtSecret(secret);
}

async function getOptions(): Promise<Result<Options>> {
    const FORCE_FOUNDATIONDB = process.env.FORCE_FOUNDATIONDB === 'true';
    const stage: Stage = getStage();
    const awsRegion = assertDefined(
        process.env.AWS_DEFAULT_REGION,
        'AWS_DEFAULT_REGION is required for SES email service'
    );
    const jwtSecret = getJwtSecret(stage);

    const {store, hub} = await getKvStore(
        stage,
        (stage !== 'local' && stage !== 'self') || FORCE_FOUNDATIONDB
            ? 'fdb'
            : 'sqlite'
    );
    const logLevel = match(stage)
        .with('local', () => 'info' as const)
        .with('dev', () => 'info' as const)
        .with('prod', () => 'info' as const)
        .with('self', () => 'info' as const)
        .exhaustive();

    const objectStore = await getObjectStore(stage);

    const google = getGoogleOptions(stage);
    const uiPath = stage === 'self' ? './ui' : undefined;

    const superadmin = getInstanceAdminOptions();

    const errors: string[] = [];
    if (objectStore.type === 'error') {
        errors.push(...objectStore.errors);
    }
    if (google.type === 'error') {
        errors.push(...google.errors);
    }
    if (jwtSecret.type === 'error') {
        return {type: 'error', errors: jwtSecret.errors};
    }
    if (superadmin.type === 'error') {
        errors.push(...superadmin.errors);
    }
    if (!['true', 'false', undefined].includes(process.env.ENABLE_METRICS)) {
        errors.push('ENABLE_METRICS must be true or false (default is false)');
    }

    if (errors.length > 0) {
        return {type: 'error', errors};
    }

    assert(
        objectStore.type === 'ok',
        'objectStore must be ok if there are no errors'
    );
    assert(google.type === 'ok', 'google must be ok if there are no errors');
    assert(
        jwtSecret.type === 'ok',
        'jwtSecret must be ok if there are no errors'
    );
    assert(
        superadmin.type === 'ok',
        'superadmin must be ok if there are no errors'
    );

    return {
        type: 'ok',
        value: {
            objectStore: objectStore.value,
            logLevel,
            workersCount: stage === 'prod' ? cpus().length : 1,
            emailProvider: new SesEmailProvider(awsRegion),
            jwtSecret: jwtSecret.value,
            uiPath,
            hub,
            store,
            google: google.value,
            launchCluster: stage !== 'local' && stage !== 'self',
            appPort: stage === 'self' ? 8080 : 4567,
            metricsPort: 5678,
            passwordsEnabled: stage === 'local' || stage === 'self',
            superadmin: superadmin.value,
            enableMetrics: process.env.ENABLE_METRICS === 'true',
        },
    };
}

const optionsResult = await getOptions();
if (optionsResult.type === 'error') {
    for (const error of optionsResult.errors) {
        log.error({msg: error});
    }
    process.exit(1);
}
const options = optionsResult.value;

async function getKvStore(
    stage: string,
    type: 'fdb' | 'sqlite'
): Promise<{
    store: KvStore<Tuple, Uint8Array>;
    hub: Hub;
}> {
    const {store, hub} = await match(type)
        .with('fdb', async () => {
            log.info({
                msg: `using FoundationDB as a primary store (./fdb/fdb.${stage}.cluster)`,
            });
            // use a variable to prevent typescript type check
            // because this module is deleted in self-hosted docker image and never imported
            const fdbModulePath: string = './fdb-kv-store.js';
            const fdbStore: Uint8KvStore & Hub = await import(
                fdbModulePath
            ).then((x: any) => {
                // eslint-disable-next-line
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
            log.info({msg: 'using Sqlite as primary store'});
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

            const stats = await store.stats();
            for (const [statName, statValue] of Object.entries(stats)) {
                log.info({
                    msg: `mvcc adapter ${camelCaseToSnakeCase(statName)}: ${statValue}`,
                });
            }

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

async function upgradeKVStore({store, superadmin: superadmin}: Options) {
    const dataLayer = new DataLayer({
        kv: store,
        hub: new MemHub(),
        crypto: NodeCryptoProvider,
        email: options.emailProvider,
        passwordsEnabled: options.passwordsEnabled,
        superadminEmails: options.superadmin ? [options.superadmin.email] : [],
    });

    await dataLayer.upgrade();

    if (superadmin) {
        log.info({msg: 'Creating superadmin...'});
        await dataLayer.createSuperadmin(superadmin);
    }
}

function getKoaCallback(app: Koa) {
    return (
        ...args: [
            req: IncomingMessage | Http2ServerRequest,
            res: ServerResponse | Http2ServerResponse,
        ]
    ) => {
        app.callback()(...args).catch(error => {
            log.error({error, msg: 'failed to handle request'});
        });
    };
}

async function launchApp(options: Options) {
    const app = new Koa();

    if (stage === 'self' && options.enableMetrics) {
        const metricsRouter =
            createMetricsRouter('standalone').prefix('/metrics');
        app.use(metricsRouter.routes()).use(metricsRouter.allowedMethods());
        app.use(helmet.default());
    }

    app.use(cors());

    const apiRouter = createApiRouter(() => coordinator, {
        google: options.google,
    }).prefix(options.uiPath ? '/api' : '');
    app.use(apiRouter.routes());

    if (options.uiPath) {
        const uiRouter = await createUiRouter({
            staticPath: options.uiPath,
            googleClientId: options.google?.clientId,
            passwordsEnabled: options.passwordsEnabled,
        });
        app.use(uiRouter.routes()).use(uiRouter.allowedMethods());
    }

    const appHttpServer = createServer(getKoaCallback(app));

    const coordinator = new CoordinatorServer({
        transport: new WsTransportServer({
            codec: new MsgpackCodec(),
            server: appHttpServer,
        }),
        kv: options.store,
        jwtProvider: new NodeJwtProvider(options.jwtSecret),
        cryptoProvider: NodeCryptoProvider,
        emailProvider: options.emailProvider,
        objectStore: options.objectStore,
        hub: options.hub,
        passwordsEnabled: options.passwordsEnabled,
        superadminEmails: options.superadmin ? [options.superadmin.email] : [],
    });

    async function shutdown() {
        log.info({msg: 'shutting down app...'});
        coordinator.close('shutdown');
        appHttpServer.close();
    }

    context().onEnd(() => {
        shutdown().catch(error => {
            log.error({error, msg: 'failed to shutdown'});
        });
    });

    const appServerStarted = new Deferred<void>();
    appHttpServer.listen(options.appPort, () => appServerStarted.resolve());
    await coordinator.launch();

    await appServerStarted.promise;
}

async function launchMetrics() {
    const metrics = new Koa();
    const metricsRouter = createMetricsRouter('cluster').prefix('/metrics');
    metrics.use(metricsRouter.routes()).use(metricsRouter.allowedMethods());
    metrics.use(helmet.default());

    const metricsHttpServer = createServer(getKoaCallback(metrics));

    async function shutdown() {
        log.info({msg: 'shutting down metrics server...'});
        metricsHttpServer.close();
    }

    context().onEnd(() => {
        shutdown().catch(error => {
            log.error({error, msg: 'failed to shutdown'});
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
        log.info({msg: 'unhandled cancellation'});
        return;
    }

    log.error({error: reason, msg: 'unhandled rejection'});
});

log.info({msg: 'Upgrading KV store...'});
await upgradeKVStore(options);
log.info({msg: 'Successfully upgraded KV store'});

log.info({msg: 'launching coordinator...'});

if (cluster.isPrimary && options.launchCluster) {
    log.info({msg: `Master process ${process.pid} is running`});

    serverCtx
        .run(async () => {
            try {
                await launchMetrics();
                log.info({
                    msg: `metrics server is running on port ${options.metricsPort}`,
                });
            } catch (error) {
                log.error({error, msg: 'failed to launch coordinator'});
            }
        })
        .catch(error => {
            log.error({error, msg: 'error during launch'});
        });

    for (let i = 0; i < options.workersCount; i++) {
        const spawnWorker = () => {
            const worker = cluster.fork();
            log.info({msg: `Spawned worker ${worker.process.pid}`});

            worker.on('exit', (code, signal) => {
                log.error({
                    msg: `Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting..`,
                    code,
                    signal,
                });
                spawnWorker();
            });
        };

        for (let i = 0; i < options.workersCount; i++) {
            spawnWorker();
        }
    }
} else {
    log.info({
        msg: `Worker process ${process.pid} is running`,
        pid: process.pid,
    });

    serverCtx
        .run(async () => {
            try {
                await launchApp(options);
                log.info({
                    msg: `coordinator is running on port ${options.appPort}`,
                });
            } catch (error) {
                log.error({error, msg: 'failed to launch coordinator'});
            }
        })
        .catch(error => {
            log.error({error, msg: 'error during launch'});
        });
}
