import {MsgpackCodec} from '../codec.js';
import {anonAuthContext, AuthContextParser} from '../data/auth-context.js';
import {DataLayer} from '../data/data-layer.js';
import type {
    CryptoService,
    EmailService,
    JwtService,
    ObjectStore,
} from '../data/infrastructure.js';
import type {KvStore} from '../kv/kv-store.js';
import {log} from '../logger.js';
import {tracerManager} from '../tracer-manager.js';
import {
    MemTransportClient,
    MemTransportServer,
} from '../transport/mem-transport.js';
import {RpcHubClient, RpcHubServer} from '../transport/rpc-hub.js';
import type {RpcMessage} from '../transport/rpc-message.js';
import {RpcServer} from '../transport/rpc.js';
import type {TransportServer} from '../transport/transport.js';
import type {Tuple} from '../tuple.js';
import {getIdentity, signJwtToken} from './auth-api.js';
import {
    createCoordinatorApi,
    type CoordinatorApiInputState,
} from './coordinator-api.js';

export interface CoordinatorServerOptions {
    transport: TransportServer<RpcMessage>;
    kv: KvStore<Tuple, Uint8Array>;
    jwt: JwtService;
    crypto: CryptoService;
    email: EmailService;
    jwtSecret: string;
    objectStore: ObjectStore;
}

export class CoordinatorServer {
    private readonly dataLayer: DataLayer;
    private readonly rpcServer: RpcServer<CoordinatorApiInputState>;

    constructor(private readonly options: CoordinatorServerOptions) {
        const hubMemTransportServer = new MemTransportServer(
            new MsgpackCodec()
        );
        const hubAuthSecret = 'hub-auth-secret';
        const hubServer = new RpcHubServer(
            hubMemTransportServer,
            hubAuthSecret,
            'hub'
        );

        hubServer.launch().catch(error => {
            log.error(error, 'HubServer failed to launch');
        });

        const hubClient = new RpcHubClient(
            new MemTransportClient(hubMemTransportServer, new MsgpackCodec()),
            hubAuthSecret,
            'hub',
            tracerManager.get('coord')
        );

        this.dataLayer = new DataLayer(
            this.options.kv,
            hubClient,
            this.options.jwtSecret
        );
        const authContextParser = new AuthContextParser(4, this.options.jwt);
        this.rpcServer = new RpcServer(
            this.options.transport,
            createCoordinatorApi(),
            {
                authContextParser,
                dataLayer: this.dataLayer,
                jwt: this.options.jwt,
                crypto: this.options.crypto,
                emailService: this.options.email,
                hub: hubClient,
                config: {
                    jwtSecret: this.options.jwtSecret,
                },
                objectStore: this.options.objectStore,
                close: reason => {
                    // todo: support async close
                    setTimeout(() => {
                        this.dataLayer.close(reason);
                        hubServer.close(reason);
                    }, 800); // give some time to finish pending requests
                },
            },
            'server',
            tracerManager.get('coord')
        );
    }

    async status() {
        await this.dataLayer.transact(anonAuthContext, async tx => {
            await tx.boards.getByKey('SYNC');
        });

        return {status: 'ok'};
    }

    async launch(): Promise<void> {
        await this.rpcServer.launch();
    }

    close(reason: unknown) {
        this.rpcServer.close(reason);
    }

    async issueJwtByUserEmail(params: {
        email: string;
        fullName: string;
    }): Promise<string> {
        return await this.dataLayer.transact(
            {identityId: undefined, superadmin: false, userId: undefined},
            async dataCx => {
                const identity = await getIdentity({
                    identities: dataCx.identities,
                    users: dataCx.users,
                    email: params.email,
                    crypto: this.options.crypto,
                    fullName: params.fullName,
                });

                return signJwtToken(
                    this.options.jwt,
                    identity,
                    this.options.jwtSecret
                );
            }
        );
    }
}

export interface BaseVerifySignInCodeResponse<TType extends string> {
    readonly type: TType;
}

export interface SuccessVerifySignInCodeResponse
    extends BaseVerifySignInCodeResponse<'success'> {
    readonly token: string;
}

export interface InvalidCodeVerifySignInCodeResponse
    extends BaseVerifySignInCodeResponse<'invalid_code'> {}

export interface CodeExpiredVerifySignInCodeResponse
    extends BaseVerifySignInCodeResponse<'code_expired'> {}

export interface CooldownVerifySignInCodeResponse
    extends BaseVerifySignInCodeResponse<'cooldown'> {}

export type VerifySignInCodeResponse =
    | SuccessVerifySignInCodeResponse
    | InvalidCodeVerifySignInCodeResponse
    | CodeExpiredVerifySignInCodeResponse
    | CooldownVerifySignInCodeResponse;
