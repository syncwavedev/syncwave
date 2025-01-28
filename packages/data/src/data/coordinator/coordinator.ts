import {Context} from '../../context.js';
import {Uint8KVStore} from '../../kv/kv-store.js';
import {AuthContextParser} from '../auth-context.js';
import {Message} from '../communication/message.js';
import {TransportServer} from '../communication/transport.js';
import {DataLayer} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {RpcServer} from '../rpc/rpc-protocol.js';
import {getIdentity, signJwtToken} from './auth-api.js';
import {
    CoordinatorApiInputState,
    createCoordinatorApi,
} from './coordinator-api.js';

export class Coordinator {
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
        this.dataLayer = new DataLayer(kv, jwtSecret);
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
