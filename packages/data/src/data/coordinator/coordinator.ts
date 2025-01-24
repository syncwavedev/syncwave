import {z} from 'zod';
import {BusinessError} from '../../errors.js';
import {Uint8KVStore} from '../../kv/kv-store.js';
import {whenAll} from '../../utils.js';
import {zUuid} from '../../uuid.js';
import {Actor, DataAccessor} from '../actor.js';
import {AuthContext, AuthContextParser} from '../auth-context.js';
import {Message} from '../communication/message.js';
import {
    createApi,
    handler,
    setupRpcServer,
    wrapApi,
} from '../communication/rpc.js';
import {Connection, TransportServer} from '../communication/transport.js';
import {createDataInspectorApi} from '../data-inspector.js';
import {DataLayer, TransactionContext} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {BoardId} from '../repos/board-repo.js';
import {TaskId} from '../repos/task-repo.js';
import {createAuthApi, getIdentity, signJwtToken} from './auth-api.js';

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
        setupRpcServer(conn, createCoordinatorApi, async (message, fn) => {
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

function createCoordinatorApi({
    ctx,
    auth,
    jwt,
    crypto,
    emailService,
    enqueueEffect,
}: {
    ctx: TransactionContext;
    auth: AuthContext;
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    enqueueEffect: (cb: () => Promise<void>) => void;
}) {
    const actor: Actor = new Actor(ctx.tx, auth, {type: 'coordinator'});

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

    const authApi = createAuthApi({
        ctx,
        crypto,
        emailService,
        enqueueEffect,
        jwt,
    });

    const inspectorApi = wrapApi(
        createDataInspectorApi(ctx.tx, ctx.dataNode, auth),
        async (req, next) => {
            if (!auth.superAdmin) {
                throw new BusinessError(
                    'only super admins can use inspector api',
                    'forbidden'
                );
            }

            return await next(req);
        }
    );

    return {
        ...dbApi,
        ...authApi,
        ...inspectorApi,
    };
}

export type CoordinatorApi = ReturnType<typeof createCoordinatorApi>;
