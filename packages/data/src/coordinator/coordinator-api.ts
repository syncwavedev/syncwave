import {type AuthContext, AuthContextParser} from '../data/auth-context.js';
import {AwarenessApiState, createAwarenessApi} from '../data/awareness-api.js';
import {
    type ChangeEvent,
    type Config,
    DataLayer,
    type Transact,
} from '../data/data-layer.js';
import {EventStoreReader} from '../data/event-store.js';
import type {
    CryptoService,
    EmailService,
    JwtService,
    ObjectStore,
} from '../data/infrastructure.js';
import {createReadApi, ReadApiState} from '../data/read-api.js';
import {createWriteApi, WriteApiState} from '../data/write-api.js';
import {log} from '../logger.js';
import type {Hub} from '../transport/hub.js';
import {
    type Api,
    applyMiddleware,
    type InferRpcClient,
    mapApiState,
} from '../transport/rpc.js';
import {type AuthApi, type AuthApiState, createAuthApi} from './auth-api.js';
import {createE2eApi} from './e2e-api.js';

export interface CoordinatorApiState {
    auth: AuthContext;
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    esReader: EventStoreReader<ChangeEvent>;
    hub: Hub;
    transact: Transact;
    objectStore: ObjectStore;
}

export interface CoordinatorApiInputState {
    dataLayer: DataLayer;
    config: Config;
    authContextParser: AuthContextParser;
    jwt: JwtService;
    hub: Hub;
    emailService: EmailService;
    crypto: CryptoService;
    objectStore: ObjectStore;
    close: (reason: unknown) => void;
}

export function createCoordinatorApi() {
    const adaptedWriteApi = applyMiddleware(
        createWriteApi(),
        async (next, state: CoordinatorApiState) => {
            await state.transact(async tx => {
                await next(
                    new WriteApiState(
                        tx,
                        state.objectStore,
                        tx.ps,
                        state.crypto,
                        state.emailService
                    )
                );
            });
        }
    );

    const adaptedReadApi = mapApiState(
        createReadApi(),
        (state: CoordinatorApiState) => {
            return new ReadApiState(
                state.transact,
                state.esReader,
                state.auth,
                state.objectStore
            );
        }
    );

    const adaptedAwarenessApi = mapApiState(
        createAwarenessApi(),
        (state: CoordinatorApiState) => {
            return new AwarenessApiState(
                state.transact,
                state.hub,
                state.auth,
                state.esReader
            );
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
                tx,
                emailService: state.emailService,
                jwt: state.jwt,
                scheduleEffect: tx.scheduleEffect,
                boardService: tx.boardService,
            });
        });
    });

    const e2eApi = createE2eApi();

    const combinedApi = {
        ...e2eApi,
        ...adaptedReadApi,
        ...adaptedWriteApi,
        ...adaptedAuthApi,
        ...adaptedAwarenessApi,
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
            {
                dataLayer,
                authContextParser,
                objectStore,
                jwt,
                hub,
                emailService,
                crypto,
                config,
            },
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
                objectStore,
                hub,
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
