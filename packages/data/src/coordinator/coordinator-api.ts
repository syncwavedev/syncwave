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
import {stringifyLogPart} from '../transport/rpc-streamer.js';
import {
    type Api,
    applyMiddleware,
    type InferRpcClient,
    mapApiState,
} from '../transport/rpc.js';
import {type AuthApi, type AuthApiState, createAuthApi} from './auth-api.js';

export interface CoordinatorApiPrivateState {
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    esReader: EventStoreReader<ChangeEvent>;
    hub: Hub;
    transact: Transact;
    objectStore: ObjectStore;
}

export interface CoordinatorApiPublicState {
    dataLayer: DataLayer;
    config: Config;
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
        async (next, state: CoordinatorApiPrivateState) => {
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
        (state: CoordinatorApiPrivateState) => {
            return new ReadApiState(
                state.transact,
                state.esReader,
                state.objectStore
            );
        }
    );

    const adaptedAwarenessApi = mapApiState(
        createAwarenessApi(),
        (state: CoordinatorApiPrivateState) => {
            return new AwarenessApiState(
                state.transact,
                state.hub,
                state.esReader
            );
        }
    );

    const adaptedAuthApi = applyMiddleware<
        AuthApiState,
        CoordinatorApiPrivateState,
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

    const combinedApi = {
        ...adaptedReadApi,
        ...adaptedWriteApi,
        ...adaptedAuthApi,
        ...adaptedAwarenessApi,
    } satisfies Api<CoordinatorApiPrivateState>;

    const timeLoggerApi = applyMiddleware<
        CoordinatorApiPrivateState,
        CoordinatorApiPrivateState,
        typeof combinedApi
    >(combinedApi, async (next, state, processorName, arg) => {
        return await log.time(
            `${processorName}(${stringifyLogPart(arg)})`,
            () => next(state)
        );
    });

    const resultApi = applyMiddleware<
        CoordinatorApiPrivateState,
        CoordinatorApiPublicState,
        typeof timeLoggerApi
    >(
        timeLoggerApi,
        async (
            next,
            {dataLayer, objectStore, jwt, hub, emailService, crypto},
            {principal}
        ) => {
            const state: CoordinatorApiPrivateState = {
                transact: fn => dataLayer.transact(principal, fn),
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
