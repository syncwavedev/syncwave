import {createHash} from 'crypto';
import {sign} from 'jsonwebtoken';
import {z} from 'zod';
import {Uint8KVStore} from '../../kv/kv-store';
import {assertNever} from '../../utils';
import {DataLayer, TransactionContext} from '../data-layer';
import {IdentityId} from '../repos/id-repo';
import {UserId} from '../repos/user-repo';
import {AuthContext, AuthContextParser} from './auth-context';
import {Message, RequestMessage, createMessageId} from './message';
import {rpc, service} from './rpc';
import {Connection, TransportServer} from './transport';

export class Coordinator {
    private readonly dataLayer: DataLayer;
    private readonly authContextParser = new AuthContextParser();

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
        conn.subscribe(async ev => {
            if (ev.type === 'close') {
                // nothing to do
            } else if (ev.type === 'message') {
                await this.handleMessage(conn, ev.message);
            } else {
                assertNever(ev);
            }
        });
    }

    private async handleMessage(conn: Connection, message: Message) {
        if (message.type === 'ping') {
            conn.send({type: 'pong', id: createMessageId(), pingId: message.id});
        } else if (message.type === 'pong') {
            // nothing to do
        } else if (message.type === 'request') {
            await this.dataLayer.transaction(async ctx => {
                await this.handleRequest(ctx, conn, message);
            });
        } else if (message.type === 'response') {
            // nothing to do
        } else {
            assertNever(message);
        }
    }

    private async handleRequest(ctx: TransactionContext, conn: Connection, message: RequestMessage) {
        const authContext = this.authContextParser.parse(ctx, message.headers?.auth);
        const server = createCoordinatorRpc(ctx, authContext);

        try {
            const result = await server[message.payload.name](message.payload.arg as any);
            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId: message.id,
                payload: {type: 'success', result},
            });
        } catch (err: any) {
            console.error(err);

            const errorMessage = typeof (err ?? {})['message'] === 'string' ? err['message'] : undefined;
            const responseMessage = `${err?.constructor.name ?? '<null>'}: ${errorMessage ?? '<null>'}`;

            await conn.send({
                id: createMessageId(),
                type: 'response',
                requestId: message.id,
                payload: {
                    type: 'error',
                    message: process.env.NODE_ENV === 'development' ? responseMessage : undefined,
                },
            });
        }
    }
}

function createCoordinatorRpc(ctx: TransactionContext, auth: AuthContext) {
    return service({
        me: rpc({
            schema: z.object({}),
            handle: async ({}) => ({userId: auth.userId}),
        }),
        signIn: rpc({
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

export type CoordinatorRpc = ReturnType<typeof createCoordinatorRpc>;
