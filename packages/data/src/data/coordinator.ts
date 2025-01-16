import {z} from 'zod';
import {Uint8KVStore} from '../kv/kv-store';
import {zUuid} from '../uuid';
import {Actor, DataAccessor} from './actor';
import {AuthContext, AuthContextParser} from './auth-context';
import {Message} from './communication/message';
import {createApi, handler, setupRpcServer} from './communication/rpc';
import {Connection, TransportServer} from './communication/transport';
import {Crypto} from './crypto';
import {DataLayer, TransactionContext} from './data-layer';
import {JwtService} from './jwt-service';
import {BoardId} from './repos/board-repo';
import {TaskId} from './repos/task-repo';
import {UserId} from './repos/user-repo';

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
            await this.dataLayer.transaction(async ctx => {
                const auth = authContextParser.parse(ctx, message.headers?.auth);
                await fn({ctx, auth, jwt: this.jwt, crypto: this.crypto});
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

                const exp = new Date();
                exp.setFullYear(exp.getFullYear() + 20);

                return {
                    type: 'success' as const,
                    token: jwt.sign(
                        {
                            sub: identity.id.toString(),
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
    sub: string;
    exp: number;
    user_id: UserId;
}

function computePasswordHash(crypto: Crypto, salt: string, password: string) {
    return crypto.sha256(`${salt}:${password}`);
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
