import {BusinessError} from '../../errors.js';
import {assertNever, whenAll} from '../../utils.js';
import {Actor} from '../actor.js';
import {AuthContext, AuthContextParser} from '../auth-context.js';
import {
    Api,
    apiStateAdapter,
    InferRpcClient,
    ProcessorContext,
    Streamer,
    wrapApi,
} from '../communication/rpc.js';
import {dataInspectorApi, DataInspectorApiState} from '../data-inspector.js';
import {DataLayer, TransactionContext} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {authApi, AuthApiState} from './auth-api.js';
import {dbApi} from './db-api.js';

export interface CoordinatorApiState {
    ctx: TransactionContext;
    auth: AuthContext;
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    enqueueEffect: (cb: () => Promise<void>) => void;
}

type CoordinatorApiInputState = ProcessorContext<{
    dataLayer: DataLayer;
    authContextParser: AuthContextParser;
    jwt: JwtService;
    emailService: EmailService;
    crypto: CryptoService;
}>;

export const coordinatorApi = (() => {
    const adaptedDbApi = apiStateAdapter<
        Actor,
        CoordinatorApiState,
        typeof dbApi
    >(
        dbApi,
        state => new Actor(state.ctx.tx, state.auth, {type: 'coordinator'})
    );

    const adaptedInspectorApi = apiStateAdapter<
        DataInspectorApiState,
        CoordinatorApiState,
        typeof dataInspectorApi
    >(dataInspectorApi, state => ({
        dataNode: state.ctx.dataNode,
        rootTx: state.ctx.tx,
    }));

    const wrappedAndAdaptedInspectorApi = wrapApi<
        CoordinatorApiState,
        CoordinatorApiState,
        typeof adaptedInspectorApi
    >(adaptedInspectorApi, next => {
        if (next.type === 'handler') {
            return {
                type: 'handler',
                handle: async (state, request, cx) => {
                    if (!state.auth.superadmin) {
                        throw new BusinessError(
                            `only superadmins can use inspector api. id = ${state.auth.identityId}`,
                            'forbidden'
                        );
                    }

                    return await next.handle(state, request, cx);
                },
            };
        } else if (next.type === 'streamer') {
            return {
                type: 'streamer',
                stream: async function* (state, request, cx) {
                    if (!state.auth.superadmin) {
                        throw new BusinessError(
                            `only superadmins can use inspector api. id = ${state.auth.identityId}`,
                            'forbidden'
                        );
                    }

                    yield* next.stream(state, request, cx);
                },
            };
        } else {
            assertNever(next);
        }
    });

    const adaptedAuthApi = apiStateAdapter<
        AuthApiState,
        CoordinatorApiState,
        typeof authApi
    >(authApi, state => ({
        crypto: state.crypto,
        ctx: state.ctx,
        emailService: state.emailService,
        enqueueEffect: state.enqueueEffect,
        jwt: state.jwt,
    }));

    const combinedApi = {
        ...adaptedDbApi,
        ...adaptedAuthApi,
        ...wrappedAndAdaptedInspectorApi,
    } satisfies Api<CoordinatorApiState>;

    const resultApi = wrapApi<
        CoordinatorApiState,
        CoordinatorApiInputState,
        typeof combinedApi
    >(combinedApi, processor => {
        if (processor.type === 'handler') {
            return {
                type: 'handler',
                handle: async (
                    {
                        state: {
                            dataLayer,
                            authContextParser,
                            jwt,
                            emailService,
                            crypto,
                        },
                        message,
                    },
                    req,
                    cx
                ) => {
                    let effects: Array<() => Promise<void>> = [];
                    const result = await dataLayer.transaction(async ctx => {
                        effects = [];
                        const auth = await authContextParser.parse(
                            ctx,
                            message.headers?.auth
                        );
                        const state: CoordinatorApiState = {
                            ctx,
                            auth,
                            jwt,
                            crypto,
                            emailService,
                            enqueueEffect: effect => effects.push(effect),
                        };

                        return await processor.handle(state, req, cx);
                    });
                    await whenAll(effects.map(effect => effect()));
                    return result;
                },
            };
        } else if (processor.type === 'streamer') {
            return {
                type: 'streamer',
                stream: async function* (
                    {
                        state: {
                            dataLayer,
                            authContextParser,
                            jwt,
                            emailService,
                            crypto,
                        },
                        message,
                    },
                    req,
                    cx
                ) {
                    let effects: Array<() => Promise<void>> = [];
                    const result = await dataLayer.transaction(async ctx => {
                        effects = [];
                        const auth = await authContextParser.parse(
                            ctx,
                            message.headers?.auth
                        );
                        const state: CoordinatorApiState = {
                            ctx,
                            auth,
                            jwt,
                            crypto,
                            emailService,
                            enqueueEffect: effect => effects.push(effect),
                        };

                        return processor.stream(state, req, cx);
                    });
                    await whenAll(effects.map(effect => effect()));
                    yield* result;
                },
            } satisfies Streamer<CoordinatorApiInputState, any, any>;
        } else {
            assertNever(processor);
        }
    });

    return resultApi;
})();

export type CoordinatorRpc = InferRpcClient<typeof coordinatorApi>;
