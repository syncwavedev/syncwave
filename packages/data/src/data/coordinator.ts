import {z} from 'zod';
import {Uint8KVStore} from '../kv/kv-store.js';
import {getNow} from '../timestamp.js';
import {zUuid} from '../uuid.js';
import {Actor, DataAccessor} from './actor.js';
import {AuthContext, AuthContextParser} from './auth-context.js';
import {Message} from './communication/message.js';
import {createApi, handler, setupRpcServer} from './communication/rpc.js';
import {Connection, TransportServer} from './communication/transport.js';
import {Crypto} from './crypto.js';
import {DataLayer, TransactionContext} from './data-layer.js';
import {JwtService} from './jwt-service.js';
import {BoardId} from './repos/board-repo.js';
import {EmailTakenIdentityRepoError, Identity, createIdentityId} from './repos/identity-repo.js';
import {TaskId} from './repos/task-repo.js';
import {UserId, createUserId} from './repos/user-repo.js';

export class Coordinator {
    private readonly dataLayer: DataLayer;

    constructor(
        private readonly transport: TransportServer<Message>,
        kv: Uint8KVStore,
        private readonly jwt: JwtService,
        private readonly crypto: Crypto,
        jwtSecret: string
    ) {
        this.dataLayer = new DataLayer(kv, jwtSecret);
    }

    async launch(): Promise<void> {
        await this.transport.launch(conn => this.handleConnection(conn));
    }

    close() {
        this.transport.close();
    }

    private handleConnection(conn: Connection<Message>): void {
        const authContextParser = new AuthContextParser(4, this.jwt);
        setupRpcServer(conn, createCoordinatorApi, async (message, fn) => {
            return await this.dataLayer.transaction(async ctx => {
                const auth = authContextParser.parse(ctx, message.headers?.auth);
                return await fn({ctx, auth, jwt: this.jwt, crypto: this.crypto});
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

export interface BaseSignUpResponse<TType extends string> {
    readonly type: TType;
}

export interface SuccessSignUpResponse extends BaseSignUpResponse<'success'> {
    readonly token: string;
}

export interface EmailTakenSignUpResponse extends BaseSignUpResponse<'email_taken'> {}

export interface PasswordTooShortSignUpResponse extends BaseSignUpResponse<'password_too_short'> {}

export type SignUpResponse = SuccessSignUpResponse | EmailTakenSignUpResponse | PasswordTooShortSignUpResponse;

function createCoordinatorApi({
    ctx,
    auth,
    jwt,
    crypto,
}: {
    ctx: TransactionContext;
    auth: AuthContext;
    jwt: JwtService;
    crypto: Crypto;
}) {
    const actor: Actor = new Actor(ctx.txn, auth, {type: 'coordinator'});

    const dbApi = createApi({
        getMe: handler({
            schema: z.object({}),
            handle: actor.getMe.bind(actor),
        }),
        getMyBoards: handler({
            schema: z.object({}),
            handle: actor.getMyBoards.bind(actor),
        }),
        getBoardTasks: handler({
            schema: z.object({boardId: zUuid<BoardId>()}),
            handle: actor.getBoardTasks.bind(actor),
        }),
        getTask: handler({
            schema: z.object({taskId: zUuid<TaskId>()}),
            handle: actor.getTask.bind(actor),
        }),
        createTask: handler({
            schema: z.object({
                taskId: zUuid<TaskId>(),
                boardId: zUuid<BoardId>(),
                title: z.string(),
            }),
            handle: actor.createTask.bind(actor),
        }),
        createBoard: handler({
            schema: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
                slug: z.string().optional(),
            }),
            handle: actor.createBoard.bind(actor),
        }),
        getBoard: handler({
            schema: z.object({
                boardId: zUuid<BoardId>(),
            }),
            handle: actor.getBoard.bind(actor),
        }),
        setBoardSlug: handler({
            schema: z.object({
                boardId: zUuid<BoardId>(),
                slug: z.string(),
            }),
            handle: actor.setBoardSlug.bind(actor),
        }),
        updateBoardName: handler({
            schema: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
            }),
            handle: actor.updateBoardName.bind(actor),
        }),
        updateTaskTitle: handler({
            schema: z.object({
                taskId: zUuid<TaskId>(),
                title: z.string(),
            }),
            handle: actor.updateTaskTitle.bind(actor),
        }),
    } satisfies DataAccessor);

    const authApi = createApi({
        debug: handler({
            schema: z.object({}),
            handle: async () => {
                const identities = ctx.identities.getByEmail('tilyupo@gmail.com');
                return identities;
            },
        }),
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

                const passwordHash = computePasswordHash(crypto, identity.salt, password);
                if (identity.passwordHash !== passwordHash) {
                    return {type: 'password_invalid' as const};
                }

                return {
                    type: 'success' as const,
                    token: createToken(jwt, identity, ctx.config.jwtSecret),
                };
            },
        }),
        signUp: handler({
            schema: z.object({
                email: z.string(),
                password: z.string(),
            }),
            handle: async ({email, password}): Promise<SignUpResponse> => {
                if (password.length < 6) {
                    return {type: 'password_too_short'};
                }

                const salt = Math.random().toString().split('.')[1];
                const passwordHash = computePasswordHash(crypto, salt, password);

                const now = getNow();
                const userId = createUserId();

                const identity: Identity = {
                    id: createIdentityId(),
                    createdAt: now,
                    updatedAt: now,
                    email,
                    salt,
                    passwordHash,
                    userId,
                };
                try {
                    await ctx.identities.create(identity);
                } catch (err) {
                    if (err instanceof EmailTakenIdentityRepoError) {
                        return {type: 'email_taken'};
                    }
                }

                await ctx.users.create({
                    id: userId,
                    createdAt: now,
                    updatedAt: now,
                    name: 'anon',
                });

                return {
                    type: 'success' as const,
                    token: createToken(jwt, identity, ctx.config.jwtSecret),
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
    sub: string;
    exp: number;
    user_id: UserId;
}

function createToken(jwt: JwtService, identity: Identity, jwtSecret: string) {
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 50);

    return jwt.sign(
        {
            sub: identity.id.toString(),
            exp: Math.trunc(exp.getTime() / 1000),
            user_id: identity.userId,
        } satisfies JwtPayload,
        jwtSecret
    );
}

function computePasswordHash(crypto: Crypto, salt: string, password: string) {
    return crypto.sha256(`${salt}:${password}`);
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
