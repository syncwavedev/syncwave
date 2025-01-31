import {Cx} from '../../context.js';
import {BusinessError} from '../../errors.js';
import {AuthContext, AuthContextParser} from '../auth-context.js';
import {EventStoreReader} from '../communication/event-store.js';
import {createReadApi, ReadApiState} from '../data-api/read-api.js';
import {createWriteApi, WriteApiState} from '../data-api/write-api.js';
import {dataInspectorApi} from '../data-inspector.js';
import {ChangeEvent, Config, DataLayer, Transact} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {Api, applyMiddleware, InferRpcClient, mapApiState} from '../rpc/rpc.js';
import {AuthApi, AuthApiState, createAuthApi} from './auth-api.js';
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

export function createCoordinatorApi(cx: Cx) {
    const adaptedWriteApi = applyMiddleware(
        cx,
        createWriteApi(),
        async (cx, next, state: CoordinatorApiState) => {
            await state.transact(cx, async (cx, tx) => {
                await next(cx, new WriteApiState(tx, state.auth));
            });
        }
    );

    const adaptedReadApi = mapApiState(
        cx,
        createReadApi(),
        (cx, state: CoordinatorApiState) => {
            return new ReadApiState(state.transact, state.esReader, state.auth);
        }
    );

    const adaptedInspectorApi = applyMiddleware(
        cx,
        dataInspectorApi,
        async (cx, next, state: CoordinatorApiState) => {
            await state.transact(cx, async (cx, tx) => {
                await next(cx, {
                    dataNode: tx.dataNode,
                    rootTx: tx.tx,
                });
            });
        }
    );

    const wrappedAndAdaptedInspectorApi = applyMiddleware(
        cx,
        adaptedInspectorApi,
        async (cx, next, state: CoordinatorApiState) => {
            if (!state.auth.superadmin) {
                throw new BusinessError(
                    cx,
                    `only superadmins can use inspector api. id = ${state.auth.identityId}`,
                    'forbidden'
                );
            }
            await next(cx, state);
        }
    );

    const adaptedAuthApi = applyMiddleware<
        AuthApiState,
        CoordinatorApiState,
        AuthApi
    >(cx, createAuthApi(), async (cx, next, state) => {
        await state.transact(cx, async (cx, tx) => {
            await next(cx, {
                crypto: state.crypto,
                cx: tx,
                emailService: state.emailService,
                jwt: state.jwt,
                scheduleEffect: tx.scheduleEffect,
            });
        });
    });

    const testApi = createTestApi();

    const combinedApi = {
        ...testApi,
        ...adaptedReadApi,
        ...adaptedWriteApi,
        ...adaptedAuthApi,
        ...wrappedAndAdaptedInspectorApi,
    } satisfies Api<CoordinatorApiState>;

    const resultApi = applyMiddleware<
        CoordinatorApiState,
        CoordinatorApiInputState,
        typeof combinedApi
    >(
        cx,
        combinedApi,
        async (
            cx,
            next,
            {dataLayer, authContextParser, jwt, emailService, crypto, config},
            headers
        ) => {
            const auth = await authContextParser.parse(
                config.jwtSecret,
                headers.auth
            );
            const state: CoordinatorApiState = {
                transact: dataLayer.transact.bind(dataLayer),
                auth,
                jwt,
                crypto,
                emailService,
                esReader: dataLayer.esReader,
            };

            return await next(cx, state);
        }
    );

    return resultApi;
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
export type CoordinatorRpc = InferRpcClient<CoordinatorApi>;
