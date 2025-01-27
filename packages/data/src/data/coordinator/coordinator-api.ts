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
import {
    Api,
    applyMiddleware,
    InferRpcClient,
    mapApiState,
    ProcessorContext,
} from '../communication/rpc.js';
import {dataInspectorApi, DataInspectorApiState} from '../data-inspector.js';
import {DataContext, DataEffectScheduler, DataLayer} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
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
    const adaptedDbApi = mapApiState(dbApi, (state: CoordinatorApiState) => {
        return new Actor(state.ctx.tx, state.auth, {type: 'coordinator'});
    });

    const adaptedInspectorApi = mapApiState(
        dataInspectorApi,
        (state: CoordinatorApiState): DataInspectorApiState => ({
            dataNode: state.ctx.dataNode,
            rootTx: state.ctx.tx,
        })
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

    const adaptedAuthApi = mapApiState<
        AuthApiState,
        CoordinatorApiState,
        AuthApi
    >(createAuthApi(), state => ({
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
        ({busConsumer, busProducer}: CoordinatorApiState): TestApiState => ({
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
    >(combinedApi, async (next, processorContext) => {
        const {
            state: {dataLayer, authContextParser, jwt, emailService, crypto},
            message,
        } = processorContext;
        const busConsumer = new BusConsumer(
            fn =>
                dataLayer.transact(ctx => fn(withPrefix('test-bus/')(ctx.tx))),
            busHubClient,
            new MsgpackCodec()
        );
        await dataLayer.transact(async ctx => {
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
                scheduleEffect: ctx.scheduleEffect,
                busConsumer,
                busProducer: new BusProducer(
                    withPrefix('test-bus/')(ctx.tx),
                    new MsgpackCodec(),
                    busHubClient,
                    ctx.scheduleEffect
                ),
            };

            return await next(state);
        });
    });

    return resultApi;
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
export type CoordinatorRpc = InferRpcClient<CoordinatorApi>;
