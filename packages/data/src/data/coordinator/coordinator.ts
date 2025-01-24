import {Uint8KVStore} from '../../kv/kv-store.js';
import {whenAll} from '../../utils.js';
import {AuthContextParser} from '../auth-context.js';
import {Message} from '../communication/message.js';
import {setupRpcServer} from '../communication/rpc.js';
import {Connection, TransportServer} from '../communication/transport.js';
import {DataLayer} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {getIdentity, signJwtToken} from './auth-api.js';
import {coordinatorApi} from './coordinator-api.js';

export class Coordinator {
    private readonly dataLayer: DataLayer;

    constructor(
        private readonly transport: TransportServer<Message>,
        kv: Uint8KVStore,
        private readonly jwt: JwtService,
        private readonly crypto: CryptoService,
        private readonly email: EmailService,
        private readonly jwtSecret: string
    ) {
        this.dataLayer = new DataLayer(kv, jwtSecret);
    }

    async launch(): Promise<void> {
        await this.transport.launch(conn => this.handleConnection(conn));
    }

    close() {
        this.transport.close();
    }

    async issueJwtByUserEmail(email: string): Promise<string> {
        return await this.dataLayer.transaction(async ctx => {
            const identity = await getIdentity(
                ctx.identities,
                ctx.users,
                email,
                this.crypto
            );

            return signJwtToken(this.jwt, identity, this.jwtSecret);
        });
    }

    private handleConnection(conn: Connection<Message>): void {
        const authContextParser = new AuthContextParser(4, this.jwt);
        setupRpcServer(conn, coordinatorApi, async (message, fn) => {
            let effects: Array<() => Promise<void>> = [];
            const result = await this.dataLayer.transaction(async ctx => {
                effects = [];
                const auth = await authContextParser.parse(
                    ctx,
                    message.headers?.auth
                );
                return await fn({
                    ctx,
                    auth,
                    jwt: this.jwt,
                    crypto: this.crypto,
                    emailService: this.email,
                    enqueueEffect: effect => effects.push(effect),
                });
            });
            await whenAll(effects.map(effect => effect()));
            return result;
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
