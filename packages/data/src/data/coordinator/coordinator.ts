import {z} from 'zod';
import {MsgpackCodec} from '../../codec.js';
import {Context} from '../../context.js';
import {Uint8KVStore} from '../../kv/kv-store.js';
import {AuthContextParser} from '../auth-context.js';
import {HubClient, HubServer} from '../communication/hub.js';
import {
    MemTransportClient,
    MemTransportServer,
} from '../communication/mem-transport.js';
import {Message} from '../communication/message.js';
import {TransportServer} from '../communication/transport.js';
import {DataLayer} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {RpcServer} from '../rpc/rpc-engine.js';
import {getIdentity, signJwtToken} from './auth-api.js';
import {
    CoordinatorApiInputState,
    createCoordinatorApi,
} from './coordinator-api.js';

export class CoordinatorServer {
    private readonly dataLayer: DataLayer;
    private readonly rpcServer: RpcServer<CoordinatorApiInputState>;

    constructor(
        transport: TransportServer<Message>,
        kv: Uint8KVStore,
        private readonly jwt: JwtService,
        private readonly crypto: CryptoService,
        email: EmailService,
        private readonly jwtSecret: string
    ) {
        const hubMemTransportServer = new MemTransportServer(
            new MsgpackCodec()
        );
        const hubMessageSchema = z.unknown();
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

        this.dataLayer = new DataLayer(kv, hubClient, jwtSecret);
        const authContextParser = new AuthContextParser(4, jwt);
        this.rpcServer = new RpcServer(
            transport,
            createCoordinatorApi(),
            {
                authContextParser,
                dataLayer: this.dataLayer,
                jwt,
                crypto,
                emailService: email,
                config: {
                    jwtSecret: this.jwtSecret,
                },
            },
            'CRD'
        );
    }

    async launch(): Promise<void> {
        await this.rpcServer.launch();
    }

    async close() {
        await this.rpcServer.close();
    }

    async issueJwtByUserEmail(ctx: Context, email: string): Promise<string> {
        return await this.dataLayer.transact(ctx, async (ctx, dataCtx) => {
            const identity = await getIdentity(
                ctx,
                dataCtx.identities,
                dataCtx.users,
                email,
                this.crypto
            );

            return signJwtToken(this.jwt, identity, this.jwtSecret);
        });
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
