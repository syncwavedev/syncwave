import {z} from 'zod';
import {MsgpackCodec} from '../../codec.js';
import {BusinessError} from '../../errors.js';
import {withPrefix} from '../../kv/kv-store.js';
import {Actor} from '../actor.js';
import {AuthContext, AuthContextParser} from '../auth-context.js';
import {BusConsumer, BusProducer} from '../communication/bus.js';
import {HubClient, HubServer} from '../communication/hub.js';
import {
    MemTransportClient,
    MemTransportServer,
} from '../communication/mem-transport.js';
import {dataInspectorApi, DataInspectorApiState} from '../data-inspector.js';
import {DataContext, DataEffectScheduler, DataLayer} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {
    Api,
    applyMiddleware,
    InferRpcClient,
    mapApiState,
    ProcessorContext,
} from '../rpc/rpc.js';
import {AuthApi, AuthApiState, createAuthApi} from './auth-api.js';
import {dbApi} from './db-api.js';
import {createTestApi, TestApiState} from './test-api.js';

export interface CoordinatorApiState {
    ctx: DataContext;
    auth: AuthContext;
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    scheduleEffect: DataEffectScheduler;
    busProducer: BusProducer<{value: string}>;
    busConsumer: BusConsumer<{value: string}>;
}

export interface CoordinatorApiInputState {
    dataLayer: DataLayer;
    authContextParser: AuthContextParser;
    jwt: JwtService;
    emailService: EmailService;
    crypto: CryptoService;
}

export function createCoordinatorApi() {
    const adaptedDbApi = mapApiState(
        dbApi,
        (ctx, state: CoordinatorApiState) => {
            return new Actor(state.ctx.tx, state.auth, {type: 'coordinator'});
        }
    );

    const adaptedInspectorApi = mapApiState(
        dataInspectorApi,
        (ctx, state: CoordinatorApiState): DataInspectorApiState => ({
            dataNode: state.ctx.dataNode,
            rootTx: state.ctx.tx,
        })
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

    const adaptedAuthApi = mapApiState<
        AuthApiState,
        CoordinatorApiState,
        AuthApi
    >(createAuthApi(), (ctx, state) => ({
        crypto: state.crypto,
        ctx: state.ctx,
        emailService: state.emailService,
        scheduleEffect: state.scheduleEffect,
        jwt: state.jwt,
    }));

    const hubMemTransportServer = new MemTransportServer(new MsgpackCodec());
    const hubMessageSchema = z.object({
        value: z.string(),
    });
    const hubAuthSecret = 'hub-auth-secret';
    const hubServer = new HubServer(
        hubMemTransportServer,
        hubMessageSchema,
        hubAuthSecret
    );

    hubServer.launch().catch(error => {
        console.error('HubServer failed to launch', error);
    });

    const hubClient = new HubClient(
        new MemTransportClient(hubMemTransportServer, new MsgpackCodec()),
        hubMessageSchema,
        hubAuthSecret
    );

    const testApi = mapApiState(
        createTestApi(),
        (
            ctx,
            {busConsumer, busProducer}: CoordinatorApiState
        ): TestApiState => ({
            hub: hubClient,
            busConsumer,
            busProducer,
        })
    );

    const busMemTransportServer = new MemTransportServer(new MsgpackCodec());
    const busHubMessageSchema = z.void();

    const busHubAuthSecret = 'busHub-auth-secret';
    const busHubServer = new HubServer(
        busMemTransportServer,
        busHubMessageSchema,
        busHubAuthSecret
    );

    busHubServer.launch().catch(error => {
        console.error('HubServer failed to launch', error);
    });

    const busHubClient = new HubClient(
        new MemTransportClient(busMemTransportServer, new MsgpackCodec()),
        busHubMessageSchema,
        busHubAuthSecret
    );

    const combinedApi = {
        ...testApi,
        ...adaptedDbApi,
        ...adaptedAuthApi,
        ...wrappedAndAdaptedInspectorApi,
    } satisfies Api<CoordinatorApiState>;

    const resultApi = applyMiddleware<
        CoordinatorApiState,
        ProcessorContext<CoordinatorApiInputState>,
        typeof combinedApi
    >(combinedApi, async (ctx, next, processorContext) => {
        const {
            state: {dataLayer, authContextParser, jwt, emailService, crypto},
            message,
        } = processorContext;
        const busConsumer = new BusConsumer(
            (ctx, fn) =>
                dataLayer.transact(ctx, (ctx, {tx}) =>
                    fn(ctx, withPrefix('test-bus/')(tx))
                ),
            busHubClient,
            new MsgpackCodec()
        );
        await dataLayer.transact(ctx, async (ctx, dataCtx) => {
            const auth = await authContextParser.parse(
                dataCtx,
                message.headers?.auth
            );
            const state: CoordinatorApiState = {
                ctx: dataCtx,
                auth,
                jwt,
                crypto,
                emailService,
                scheduleEffect: dataCtx.scheduleEffect,
                busConsumer,
                busProducer: new BusProducer(
                    withPrefix('test-bus/')(dataCtx.tx),
                    new MsgpackCodec(),
                    busHubClient,
                    dataCtx.scheduleEffect
                ),
            };

            return await next(ctx, state);
        });
    });

    return resultApi;
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
export type CoordinatorRpc = InferRpcClient<CoordinatorApi>;
