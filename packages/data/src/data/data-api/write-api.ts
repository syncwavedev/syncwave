import {z} from 'zod';
import {Cx} from '../../context.js';
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

    ensureAuthenticated(cx: Cx): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                cx,
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }

    async ensureBoardReadAccess(cx: Cx, boardId: BoardId): Promise<Member> {
        return await this.ensureBoardWriteAccess(cx, boardId);
    }

    async ensureBoardWriteAccess(cx: Cx, boardId: BoardId): Promise<Member> {
        const meId = this.ensureAuthenticated(cx);
        const member = await this.tx.members.getByUserIdAndBoardId(
            cx,
            meId,
            boardId
        );
        if (!member) {
            throw new BusinessError(
                cx,
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
            handle: async (cx, st, {boardId, taskId, title}) => {
                const meId = st.ensureAuthenticated(cx);
                await st.ensureBoardWriteAccess(cx, boardId);
                const now = getNow();

                const counter = await st.tx.boards.incrementBoardCounter(
                    cx,
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
                await st.tx.tasks.create(cx, task);

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
            handle: async (cx, st, req) => {
                const now = getNow();

                const userId = st.ensureAuthenticated(cx);

                const board: Board = {
                    id: req.boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    name: req.name,
                    ownerId: userId,
                    slug: req.slug,
                };
                await st.tx.boards.create(cx, board);
                await st.tx.members.create(cx, {
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
            handle: async (cx, st, {boardId, name}) => {
                const [board] = await whenAll(cx, [
                    st.tx.boards.update(cx, boardId, (cx, draft) => {
                        draft.name = name;
                    }),
                    st.ensureBoardWriteAccess(cx, boardId),
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
            handle: async (cx, st, {taskId, title}) => {
                const task = await st.tx.tasks.update(
                    cx,
                    taskId,
                    (cx, draft) => {
                        draft.title = title;
                    }
                );
                await st.ensureBoardWriteAccess(cx, task.boardId);

                return task;
            },
        }),
    });
}

export type WriteApiRpc = InferRpcClient<ReturnType<typeof createWriteApi>>;
