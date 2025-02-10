import {AuthContext, AuthContextParser} from '../data/auth-context.js';
import {dataInspectorApi} from '../data/data-inspector-api.js';
import {ChangeEvent, Config, DataLayer, Transact} from '../data/data-layer.js';
import {EventStoreReader} from '../data/event-store.js';
import {
    CryptoService,
    EmailService,
    JwtService,
} from '../data/infrastructure.js';
import {createReadApi, ReadApiState} from '../data/read-api.js';
import {createWriteApi, WriteApiState} from '../data/write-api/write-api.js';
import {BusinessError} from '../errors.js';
import {log} from '../logger.js';
import {
    Api,
    applyMiddleware,
    InferRpcClient,
    mapApiState,
} from '../transport/rpc.js';
import {AuthApi, AuthApiState, createAuthApi} from './auth-api.js';
import {createE2eApi} from './e2e-api.js';
import {createTestApi} from './test-api.js';

export interface CoordinatorApiState {
    auth: AuthContext;
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    esReader: EventStoreReader<ChangeEvent>;
    transact: Transact;
}

export interface CoordinatorApiInputState {
    dataLayer: DataLayer;
    config: Config;
    authContextParser: AuthContextParser;
    jwt: JwtService;
    emailService: EmailService;
    crypto: CryptoService;
}

export function createCoordinatorApi() {
    const adaptedWriteApi = applyMiddleware(
        createWriteApi(),
        async (next, state: CoordinatorApiState) => {
            await state.transact(async tx => {
                await next(new WriteApiState(tx, tx.ps));
            });
        }
    );

    const adaptedReadApi = mapApiState(
        createReadApi(),
        (state: CoordinatorApiState) => {
            return new ReadApiState(state.transact, state.esReader, state.auth);
        }
    );

    const adaptedInspectorApi = applyMiddleware(
        dataInspectorApi,
        async (next, state: CoordinatorApiState) => {
            await state.transact(async tx => {
                await next({
                    dataNode: tx.dataNode,
                    rootTx: tx.tx,
                });
            });
        }
    );

    const wrappedAndAdaptedInspectorApi = applyMiddleware(
        adaptedInspectorApi,
        async (next, state: CoordinatorApiState) => {
            if (!state.auth.superadmin) {
                throw new BusinessError(
                    `only superadmins can use inspector api. id = ${state.auth.identityId}`,
                    'forbidden'
                );
            }
            await next(state);
        }
    );

    const adaptedAuthApi = applyMiddleware<
        AuthApiState,
        CoordinatorApiState,
        AuthApi
    >(createAuthApi(), async (next, state) => {
        await state.transact(async tx => {
            await next({
                crypto: state.crypto,
                cx: tx,
                emailService: state.emailService,
                jwt: state.jwt,
                scheduleEffect: tx.scheduleEffect,
            });
        });
    });

    const testApi = createTestApi();
    const e2eApi = createE2eApi();

    const combinedApi = {
        ...testApi,
        ...e2eApi,
        ...adaptedReadApi,
        ...adaptedWriteApi,
        ...adaptedAuthApi,
        ...wrappedAndAdaptedInspectorApi,
    } satisfies Api<CoordinatorApiState>;

    const timeLoggerApi = applyMiddleware<
        CoordinatorApiState,
        CoordinatorApiState,
        typeof combinedApi
    >(
        combinedApi,
        async (next, state, headers, processor, processorName, arg) => {
            return await log.time(
                `${processorName}(${JSON.stringify(arg)})`,
                () => next(state)
            );
        }
    );

    const resultApi = applyMiddleware<
        CoordinatorApiState,
        CoordinatorApiInputState,
        typeof timeLoggerApi
    >(
        timeLoggerApi,
        async (
            next,
            {dataLayer, authContextParser, jwt, emailService, crypto, config},
            {headers}
        ) => {
            const auth = await authContextParser.parse(
                config.jwtSecret,
                headers.auth
            );
            const state: CoordinatorApiState = {
                transact: fn => dataLayer.transact(auth, fn),
                auth,
                jwt,
                crypto,
                emailService,
                esReader: dataLayer.esReader,
            };

            return await next(state);
        }
    );

    return resultApi;
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
export type CoordinatorRpc = InferRpcClient<CoordinatorApi>;
