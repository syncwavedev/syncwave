import {AwarenessApiState, createAwarenessApi} from '../data/awareness-api.js';
import {DataLayer} from '../data/data-layer.js';
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

export interface CoordinatorApiState {
    dataLayer: DataLayer;
    jwtService: JwtService;
    hub: Hub;
    emailService: EmailService;
    crypto: CryptoService;
    objectStore: ObjectStore;
    close: (reason: unknown) => void;
}

export function createCoordinatorApi() {
    const adaptedWriteApi = applyMiddleware(
        createWriteApi(),
        async (next, state: CoordinatorApiState, ctx) => {
            await state.dataLayer.transact(ctx.principal, async tx => {
                await next(
                    new WriteApiState(
                        tx,
                        state.objectStore,
                        tx.ps,
                        state.crypto,
                        state.emailService,
                        tx.boardService,
                        state.jwtService
                    )
                );
            });
        }
    );

    const adaptedReadApi = mapApiState(
        createReadApi(),
        (state: CoordinatorApiState) => {
            return new ReadApiState(state.dataLayer, state.objectStore);
        }
    );

    const adaptedAwarenessApi = mapApiState(
        createAwarenessApi(),
        (state: CoordinatorApiState) => {
            return new AwarenessApiState(state.dataLayer, state.hub);
        }
    );

    const adaptedAuthApi = applyMiddleware<
        AuthApiState,
        CoordinatorApiState,
        AuthApi
    >(createAuthApi(), async (next, state, {principal}) => {
        await state.dataLayer.transact(principal, async tx => {
            await next({
                crypto: state.crypto,
                tx,
                emailService: state.emailService,
                jwt: state.jwtService,
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
    } satisfies Api<CoordinatorApiState>;

    const timeLoggerApi = applyMiddleware<
        CoordinatorApiState,
        CoordinatorApiState,
        typeof combinedApi
    >(combinedApi, async (next, state, ctx, processor, method, arg) => {
        return await log.time(`${method}(${stringifyLogPart(arg)})`, () =>
            next(state)
        );
    });

    return timeLoggerApi;
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
export type CoordinatorRpc = InferRpcClient<CoordinatorApi>;
