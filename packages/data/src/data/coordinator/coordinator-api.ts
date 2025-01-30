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

export function createCoordinatorApi() {
    const adaptedWriteApi = applyMiddleware(
        createWriteApi(),
        async (ctx, next, state: CoordinatorApiState) => {
            await state.transact(ctx, async (ctx, tx) => {
                await next(ctx, new WriteApiState(tx, state.auth));
            });
        }
    );

    const adaptedReadApi = mapApiState(
        createReadApi(),
        (ctx, state: CoordinatorApiState) => {
            return new ReadApiState(state.transact, state.esReader, state.auth);
        }
    );

    const adaptedInspectorApi = applyMiddleware(
        dataInspectorApi,
        async (ctx, next, state: CoordinatorApiState) => {
            await state.transact(ctx, async (ctx, tx) => {
                await next(ctx, {
                    dataNode: tx.dataNode,
                    rootTx: tx.tx,
                });
            });
        }
    );

    const wrappedAndAdaptedInspectorApi = applyMiddleware(
        adaptedInspectorApi,
        async (ctx, next, state: CoordinatorApiState) => {
            if (!state.auth.superadmin) {
                throw new BusinessError(
                    `only superadmins can use inspector api. id = ${state.auth.identityId}`,
                    'forbidden'
                );
            }
            await next(ctx, state);
        }
    );

    const adaptedAuthApi = applyMiddleware<
        AuthApiState,
        CoordinatorApiState,
        AuthApi
    >(createAuthApi(), async (ctx, next, state) => {
        await state.transact(ctx, async (ctx, tx) => {
            await next(ctx, {
                crypto: state.crypto,
                ctx: tx,
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
        combinedApi,
        async (
            ctx,
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

            return await next(ctx, state);
        }
    );

    return resultApi;
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
export type CoordinatorRpc = InferRpcClient<CoordinatorApi>;
