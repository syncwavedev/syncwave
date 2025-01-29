import {z} from 'zod';
import {astream} from '../../async-stream.js';
import {Context} from '../../context.js';
import {BusinessError} from '../../errors.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {whenAll} from '../../utils.js';
import {zUuid} from '../../uuid.js';
import {AuthContext} from '../auth-context.js';
import {EventStoreReader} from '../communication/event-store.js';
import {BoardId, BoardReadonlyRepo, zBoard} from '../repos/board-repo.js';
import {Member, MemberReadonlyRepo} from '../repos/member-repo.js';
import {TaskId, TaskReadonlyRepo, zTask} from '../repos/task-repo.js';
import {UserId, UserReadonlyRepo, zUser} from '../repos/user-repo.js';
import {createApi, handler, InferRpcClient} from '../rpc/rpc.js';

export class ReadApiState {
    public readonly boards: BoardReadonlyRepo;
    public readonly users: UserReadonlyRepo;
    public readonly tasks: TaskReadonlyRepo;
    public readonly members: MemberReadonlyRepo;

    constructor(
        tx: Uint8Transaction,
        public esReader: EventStoreReader<unknown>,
        public readonly auth: AuthContext
    ) {
        const noop = () => Promise.resolve();
        this.users = new UserReadonlyRepo(withPrefix('users/')(tx), noop);
        this.members = new MemberReadonlyRepo(withPrefix('members/')(tx), noop);
        this.boards = new BoardReadonlyRepo(withPrefix('boards/')(tx), noop);
        this.tasks = new TaskReadonlyRepo(withPrefix('tasks/')(tx), noop);
    }

    public ensureAuthenticated(): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }

    public async ensureBoardReadAccess(
        ctx: Context,
        boardId: BoardId
    ): Promise<Member> {
        return await this.ensureBoardWriteAccess(ctx, boardId);
    }

    public async ensureBoardWriteAccess(
        ctx: Context,
        boardId: BoardId
    ): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await this.members.getByUserIdAndBoardId(
            ctx,
            meId,
            boardId
        );
        if (!member) {
            throw new BusinessError(
                `user ${meId} does not have access to board ${boardId}`,
                'forbidden'
            );
        }

        return member;
    }
}

export function createReadApi() {
    return createApi<ReadApiState>()({
        getMe: handler({
            req: z.object({}),
            res: zUser().optional(),
            handle: async (ctx, actor) => {
                return await actor.users.getById(
                    ctx,
                    actor.ensureAuthenticated()
                );
            },
        }),
        getMyBoards: handler({
            req: z.object({}),
            res: z.array(zBoard()),
            handle: async (ctx, actor) => {
                const members = actor.members.getByUserId(
                    ctx,
                    actor.ensureAuthenticated()
                );
                return await astream(members)
                    .mapParallel((ctx, member) =>
                        actor.boards.getById(ctx, member.boardId)
                    )
                    .assert(x => x !== undefined)
                    .toArray(ctx);
            },
        }),
        getBoardTasks: handler({
            req: z.object({boardId: zUuid<BoardId>()}),
            res: z.array(zTask()),
            handle: async (ctx, actor, {boardId}) => {
                const [tasks] = await whenAll([
                    actor.tasks.getByBoardId(ctx, boardId).toArray(ctx),
                    actor.ensureBoardReadAccess(ctx, boardId),
                ]);

                return tasks;
            },
        }),
        getTask: handler({
            req: z.object({taskId: zUuid<TaskId>()}),
            res: zTask().optional(),
            handle: async (ctx, actor, {taskId}) => {
                const task = await actor.tasks.getById(ctx, taskId);
                if (!task) {
                    return undefined;
                }
                await actor.ensureBoardReadAccess(ctx, task.boardId);

                return task;
            },
        }),
        getBoard: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
            }),
            res: zBoard().optional(),
            handle: async (ctx, actor, req) => {
                const [board] = await whenAll([
                    actor.boards.getById(ctx, req.boardId),
                    actor.ensureBoardReadAccess(ctx, req.boardId),
                ]);

                return board;
            },
        }),
    });
}

export type ReadApiRpc = InferRpcClient<ReturnType<typeof createReadApi>>;
