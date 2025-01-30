import {z} from 'zod';
import {Context} from '../../context.js';
import {BusinessError} from '../../errors.js';
import {getNow} from '../../timestamp.js';
import {whenAll} from '../../utils.js';
import {zUuid} from '../../uuid.js';
import {AuthContext} from '../auth-context.js';
import {DataTx} from '../data-layer.js';
import {Board, BoardId, zBoard} from '../repos/board-repo.js';
import {createMemberId, Member} from '../repos/member-repo.js';
import {Task, TaskId, zTask} from '../repos/task-repo.js';
import {UserId} from '../repos/user-repo.js';
import {createApi, handler, InferRpcClient} from '../rpc/rpc.js';

export class WriteApiState {
    constructor(
        public tx: DataTx,
        public readonly auth: AuthContext
    ) {}

    ensureAuthenticated(): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }

    async ensureBoardReadAccess(
        ctx: Context,
        boardId: BoardId
    ): Promise<Member> {
        return await this.ensureBoardWriteAccess(ctx, boardId);
    }

    async ensureBoardWriteAccess(
        ctx: Context,
        boardId: BoardId
    ): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await this.tx.members.getByUserIdAndBoardId(
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

export function createWriteApi() {
    return createApi<WriteApiState>()({
        createTask: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                boardId: zUuid<BoardId>(),
                title: z.string(),
            }),
            res: zTask(),
            handle: async (ctx, st, {boardId, taskId, title}) => {
                const meId = st.ensureAuthenticated();
                await st.ensureBoardWriteAccess(ctx, boardId);
                const now = getNow();

                const counter = await st.tx.boards.incrementBoardCounter(
                    ctx,
                    boardId
                );

                const task: Task = {
                    id: taskId,
                    authorId: meId,
                    boardId: boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    title: title,
                    counter,
                };
                await st.tx.tasks.create(ctx, task);

                return task;
            },
        }),
        createBoard: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
                slug: z.string().optional(),
            }),
            res: zBoard(),
            handle: async (ctx, st, req) => {
                const now = getNow();

                const userId = st.ensureAuthenticated();

                const board: Board = {
                    id: req.boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    name: req.name,
                    ownerId: userId,
                    slug: req.slug,
                };
                await st.tx.boards.create(ctx, board);
                await st.tx.members.create(ctx, {
                    id: createMemberId(),
                    boardId: board.id,
                    createdAt: now,
                    updatedAt: now,
                    userId: userId,
                });

                return board;
            },
        }),
        updateBoardName: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
            }),
            res: zBoard(),
            handle: async (ctx, st, {boardId, name}) => {
                const [board] = await whenAll([
                    st.tx.boards.update(ctx, boardId, draft => {
                        draft.name = name;
                    }),
                    st.ensureBoardWriteAccess(ctx, boardId),
                ]);

                return board;
            },
        }),
        updateTaskTitle: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                title: z.string(),
            }),
            res: zTask(),
            handle: async (ctx, st, {taskId, title}) => {
                const task = await st.tx.tasks.update(ctx, taskId, draft => {
                    draft.title = title;
                });
                await st.ensureBoardWriteAccess(ctx, task.boardId);

                return task;
            },
        }),
    });
}

export type WriteApiRpc = InferRpcClient<ReturnType<typeof createWriteApi>>;
