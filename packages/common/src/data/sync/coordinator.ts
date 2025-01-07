import {createHash} from 'crypto';
import {sign} from 'jsonwebtoken';
import {z} from 'zod';
import {Uint8KVStore} from '../../kv/kv-store';
import {DataLayer, TransactionContext} from '../data-layer';
import {IdentityId} from '../repos/id-repo';
import {UserId} from '../repos/user-repo';
import {AuthContext} from './auth-context';
import {createApi, handler, setupRpcServer} from './rpc';
import {Connection, TransportServer} from './transport';

export class Coordinator {
    private readonly dataLayer: DataLayer;

    constructor(
        private readonly transport: TransportServer,
        kv: Uint8KVStore
    ) {
        this.transport.launch(conn => this.handleConnection(conn));
        this.dataLayer = new DataLayer(kv);
    }

    close() {
        this.transport.close();
    }

    private handleConnection(conn: Connection): void {
        setupRpcServer(conn, this.dataLayer, createCoordinatorApi);
    }
}

function createCoordinatorApi(ctx: TransactionContext, auth: AuthContext) {
    return createApi({
        me: handler({
            schema: z.object({}),
            handle: async ({}) => ({userId: auth.userId}),
        }),
        signIn: handler({
            schema: z.object({
                email: z.string(),
                password: z.string(),
            }),
            handle: async ({email, password}) => {
                const identity = await ctx.identities.getByEmail(email);
                if (!identity) {
                    return {type: 'user_not_found' as const};
                }

                const passwordHash = computePasswordHash(identity.salt, password);
                if (identity.passwordHash !== passwordHash) {
                    return {type: 'password_invalid' as const};
                }

                const exp = new Date();
                exp.setFullYear(exp.getFullYear() + 20);

                return {
                    type: 'success' as const,
                    token: sign(
                        {
                            sub: identity.id,
                            exp: Math.trunc(exp.getTime() / 1000),
                            user_id: identity.userId,
                        } satisfies JwtPayload,
                        ctx.config.jwtSecret
                    ),
                };
            },
        }),
    });
}

interface JwtPayload {
    sub: IdentityId;
    exp: number;
    user_id: UserId;
}

function computePasswordHash(salt: string, password: string) {
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
