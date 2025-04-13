import {AUTHENTICATOR_PRINCIPAL_CACHE_SIZE} from '../constants.js';
import {anonymous, Authenticator} from '../data/auth.js';
import {DataLayer} from '../data/data-layer.js';
import type {
    CryptoService,
    EmailService,
    JwtService,
    ObjectStore,
} from '../data/infrastructure.js';
import type {KvStore} from '../kv/kv-store.js';
import type {Hub} from '../transport/hub.js';
import type {RpcMessage} from '../transport/rpc-message.js';
import {RpcServer} from '../transport/rpc.js';
import type {TransportServer} from '../transport/transport.js';
import type {Tuple} from '../tuple.js';
import {getAccount, signJwtToken} from './auth-api.js';
import {
    createCoordinatorApi,
    type CoordinatorApiState,
} from './coordinator-api.js';

export interface CoordinatorServerOptions {
    transport: TransportServer<RpcMessage>;
    kv: KvStore<Tuple, Uint8Array>;
    jwtService: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    objectStore: ObjectStore;
    hub: Hub;
    uiUrl: string;
}

export class CoordinatorServer {
    private readonly dataLayer: DataLayer;
    private readonly rpcServer: RpcServer<CoordinatorApiState>;

    constructor(private readonly options: CoordinatorServerOptions) {
        this.dataLayer = new DataLayer(
            this.options.kv,
            this.options.hub,
            this.options.crypto,
            options.emailService,
            options.jwtService,
            options.uiUrl
        );
        const authenticator = new Authenticator(
            AUTHENTICATOR_PRINCIPAL_CACHE_SIZE,
            this.options.jwtService
        );

        this.rpcServer = new RpcServer(
            this.options.transport,
            createCoordinatorApi(),
            {
                dataLayer: this.dataLayer,
                jwtService: this.options.jwtService,
                crypto: this.options.crypto,
                emailService: this.options.emailService,
                hub: this.options.hub,
                objectStore: this.options.objectStore,
                close: reason => {
                    // todo: support async close
                    setTimeout(() => {
                        this.dataLayer.close(reason);
                        this.options.hub.close(reason);
                    }, 800); // give some time to finish pending requests
                },
            },
            authenticator
        );
    }

    async status() {
        await this.dataLayer.transact(anonymous, async tx => {
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
            {accountId: undefined, superadmin: false, userId: undefined},
            async tx => {
                const account = await getAccount({
                    accounts: tx.accounts,
                    users: tx.users,
                    email: params.email,
                    crypto: this.options.crypto,
                    fullName: params.fullName,
                    boardService: tx.boardService,
                });

                return signJwtToken(this.options.jwtService, account);
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
