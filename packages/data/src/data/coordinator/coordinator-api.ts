import {z} from 'zod';
import {BusinessError} from '../../errors.js';
import {zUuid} from '../../uuid.js';
import {Actor} from '../actor.js';
import {AuthContext} from '../auth-context.js';
import {
    Api,
    apiStateAdapter,
    createApi,
    handler,
    InferRpcClient,
    wrapApi,
} from '../communication/rpc.js';
import {dataInspectorApi, DataInspectorApiState} from '../data-inspector.js';
import {TransactionContext} from '../data-layer.js';
import {CryptoService, EmailService, JwtService} from '../infra.js';
import {BoardId, zBoard} from '../repos/board-repo.js';
import {TaskId, zTask} from '../repos/task-repo.js';
import {zUser} from '../repos/user-repo.js';
import {authApi, AuthApiState} from './auth-api.js';

export interface CoordinatorApiState {
    ctx: TransactionContext;
    auth: AuthContext;
    jwt: JwtService;
    crypto: CryptoService;
    emailService: EmailService;
    enqueueEffect: (cb: () => Promise<void>) => void;
}

export const coordinatorApi = (() => {
    const dbApi = createApi<Actor>()({
        getMe: handler({
            request: z.object({}),
            response: zUser().optional(),
            handle: (actor, req) => actor.getMe(req),
        }),
        getMyBoards: handler({
            request: z.object({}),
            response: z.array(zBoard()),
            handle: (actor, req) => actor.getMyBoards(req),
        }),
        getBoardTasks: handler({
            request: z.object({boardId: zUuid<BoardId>()}),
            response: z.array(zTask()),
            handle: (actor, req) => actor.getBoardTasks(req),
        }),
        getTask: handler({
            request: z.object({taskId: zUuid<TaskId>()}),
            response: zTask().optional(),
            handle: (actor, req) => actor.getTask(req),
        }),
        createTask: handler({
            request: z.object({
                taskId: zUuid<TaskId>(),
                boardId: zUuid<BoardId>(),
                title: z.string(),
            }),
            response: zTask(),
            handle: (actor, req) => actor.createTask(req),
        }),
        createBoard: handler({
            request: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
                slug: z.string().optional(),
            }),
            response: zBoard(),
            handle: (actor, req) => actor.createBoard(req),
        }),
        getBoard: handler({
            request: z.object({
                boardId: zUuid<BoardId>(),
            }),
            response: zBoard().optional(),
            handle: (actor, req) => actor.getBoard(req),
        }),
        setBoardSlug: handler({
            request: z.object({
                boardId: zUuid<BoardId>(),
                slug: z.string(),
            }),
            response: zBoard(),
            handle: (actor, req) => actor.setBoardSlug(req),
        }),
        updateBoardName: handler({
            request: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
            }),
            response: zBoard(),
            handle: (actor, req) => actor.updateBoardName(req),
        }),
        updateTaskTitle: handler({
            request: z.object({
                taskId: zUuid<TaskId>(),
                title: z.string(),
            }),
            response: zTask(),
            handle: (actor, req) => actor.updateTaskTitle(req),
        }),
    });

    const adaptedDbApi = apiStateAdapter<
        Actor,
        CoordinatorApiState,
        typeof dbApi
    >(
        dbApi,
        state => new Actor(state.ctx.tx, state.auth, {type: 'coordinator'})
    );

    const adaptedInspectorApi = apiStateAdapter<
        DataInspectorApiState,
        CoordinatorApiState,
        typeof dataInspectorApi
    >(dataInspectorApi, state => ({
        dataNode: state.ctx.dataNode,
        rootTx: state.ctx.tx,
    }));

    const wrappedAndAdaptedInspectorApi = wrapApi<
        CoordinatorApiState,
        typeof adaptedInspectorApi
    >(adaptedInspectorApi, async (state, req, next) => {
        if (!state.auth.superadmin) {
            throw new BusinessError(
                `only superadmins can use inspector api. id = ${state.auth.identityId}`,
                'forbidden'
            );
        }

        return await next(state, req);
    });

    const adaptedAuthApi = apiStateAdapter<
        AuthApiState,
        CoordinatorApiState,
        typeof authApi
    >(authApi, state => ({
        crypto: state.crypto,
        ctx: state.ctx,
        emailService: state.emailService,
        enqueueEffect: state.enqueueEffect,
        jwt: state.jwt,
    }));

    return {
        ...adaptedDbApi,
        ...adaptedAuthApi,
        ...wrappedAndAdaptedInspectorApi,
    } satisfies Api<CoordinatorApiState>;
})();

export type CoordinatorRpc = InferRpcClient<typeof coordinatorApi>;
