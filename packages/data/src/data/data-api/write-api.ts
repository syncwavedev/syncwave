import {z} from 'zod';
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

    async ensureBoardReadAccess(boardId: BoardId): Promise<Member> {
        return await this.ensureBoardWriteAccess(boardId);
    }

    async ensureBoardWriteAccess(boardId: BoardId): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await this.tx.members.getByUserIdAndBoardId(
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
            handle: async (st, {boardId, taskId, title}) => {
                const meId = st.ensureAuthenticated();
                await st.ensureBoardWriteAccess(boardId);
                const now = getNow();

                const counter =
                    await st.tx.boards.incrementBoardCounter(boardId);

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
                await st.tx.tasks.create(task);

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
            handle: async (st, req) => {
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
                await st.tx.boards.create(board);
                await st.tx.members.create({
                    id: createMemberId(),
                    boardId: board.id,
                    createdAt: now,
                    updatedAt: now,
                    userId: userId,
                    active: true,
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
            handle: async (st, {boardId, name}) => {
                const [board] = await whenAll([
                    st.tx.boards.update(boardId, draft => {
                        draft.name = name;
                    }),
                    st.ensureBoardWriteAccess(boardId),
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
            handle: async (st, {taskId, title}) => {
                const task = await st.tx.tasks.update(taskId, draft => {
                    draft.title = title;
                });
                await st.ensureBoardWriteAccess(task.boardId);

                return task;
            },
        }),
    });
}

export type WriteApiRpc = InferRpcClient<ReturnType<typeof createWriteApi>>;
