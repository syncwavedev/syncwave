import {createHash} from 'crypto';
import {sign} from 'jsonwebtoken';
import {z} from 'zod';
import {Uint8KVStore} from '../kv/kv-store';
import {unimplemented} from '../utils';
import {zUuid} from '../uuid';
import {AuthContext, AuthContextParser} from './auth-context';
import {createApi, handler, setupRpcServer} from './communication/rpc';
import {Connection, TransportServer} from './communication/transport';
import {DataLayer, TransactionContext} from './data-layer';
import {DataAccessor, Db} from './db';
import {BoardId} from './repos/board-repo';
import {IdentityId} from './repos/identity-repo';
import {TaskId} from './repos/task-repo';
import {UserId} from './repos/user-repo';

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
        const authContextParser = new AuthContextParser(4);
        setupRpcServer(conn, createCoordinatorApi, async (message, fn) => {
            await this.dataLayer.transaction(async ctx => {
                const auth = authContextParser.parse(ctx, message.headers?.auth);
                await fn({ctx, auth});
            });
        });
    }
}

export interface BaseSignInResponse<TType extends string> {
    readonly type: TType;
}

export interface SuccessSignInResponse extends BaseSignInResponse<'success'> {
    readonly token: string;
}

export interface UserNotFoundSignInResponse extends BaseSignInResponse<'user_not_found'> {}

export interface PasswordInvalidSignInResponse extends BaseSignInResponse<'password_invalid'> {}

export type SignInResponse = SuccessSignInResponse | UserNotFoundSignInResponse | PasswordInvalidSignInResponse;

function createCoordinatorApi({ctx, auth}: {ctx: TransactionContext; auth: AuthContext}) {
    const db: Db = unimplemented();

    const dbApi = createApi({
        getMe: handler({
            schema: z.object({}),
            handle: db.getMe.bind(db),
        }),
        getBoards: handler({
            schema: z.object({userId: zUuid<UserId>()}),
            handle: db.getBoards.bind(db),
        }),
        getBoardTasks: handler({
            schema: z.object({boardId: zUuid<BoardId>()}),
            handle: db.getBoardTasks.bind(db),
        }),
        getTask: handler({
            schema: z.object({taskId: zUuid<TaskId>()}),
            handle: db.getTask.bind(db),
        }),
    } satisfies DataAccessor);

    const authApi = createApi({
        signIn: handler({
            schema: z.object({
                email: z.string(),
                password: z.string(),
            }),
            handle: async ({email, password}): Promise<SignInResponse> => {
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

    return {
        ...dbApi,
        ...authApi,
    };
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
