import {z} from 'zod';
import {zBigFloat} from '../big-float.js';
import {AuthContext} from '../data/auth-context.js';
import {DataTx} from '../data/data-layer.js';
import {Board, BoardId, zBoard} from '../data/repos/board-repo.js';
import {createMemberId, Member} from '../data/repos/member-repo.js';
import {TaskId, zTask} from '../data/repos/task-repo.js';
import {UserId} from '../data/repos/user-repo.js';
import {BusinessError} from '../errors.js';
import {getNow} from '../timestamp.js';
import {createApi, handler, InferRpcClient} from '../transport/rpc.js';
import {whenAll} from '../utils.js';
import {zUuid} from '../uuid.js';
import {toPosition} from './placement.js';
import {ColumnId, zColumn} from './repos/column-repo.js';

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

    async getBoardRequired(boardId: BoardId): Promise<Board> {
        const board = await this.tx.boards.getById(boardId);
        if (board === undefined) {
            throw new BusinessError(
                `board not found: ${boardId}`,
                'board_not_found'
            );
        }

        return board;
    }

    async ensureBoardOwner(boardId: BoardId): Promise<void> {
        const userId = this.ensureAuthenticated();
        const board = await this.getBoardRequired(boardId);
        if (board.ownerId !== userId) {
            throw new BusinessError(
                `user ${this.auth.userId} is not the owner of board ${boardId}`,
                'forbidden'
            );
        }
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

    async ensureColumnWriteAccess(columnId: ColumnId): Promise<Member> {
        const column = await this.tx.columns.getById(columnId);

        if (!column) {
            throw new BusinessError(
                `column ${columnId} doesn't exist`,
                'column_not_found'
            );
        }
        return await this.ensureBoardWriteAccess(column.boardId);
    }
}

export function createWriteApi() {
    return createApi<WriteApiState>()({
        createTask: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                boardId: zUuid<BoardId>(),
                columnId: zUuid<ColumnId>().nullable(),
                title: z.string(),
                placement: z.discriminatedUnion('type', [
                    z.object({
                        type: z.literal('before'),
                        position: zBigFloat(),
                    }),
                    z.object({
                        type: z.literal('after'),
                        position: zBigFloat(),
                    }),
                    z.object({
                        type: z.literal('between'),
                        positionA: zBigFloat(),
                        positionB: zBigFloat(),
                    }),
                    z.object({
                        type: z.literal('random'),
                    }),
                ]),
            }),
            res: zTask(),
            handle: async (
                st,
                {boardId, taskId, title, placement, columnId}
            ) => {
                const meId = st.ensureAuthenticated();
                await st.ensureBoardWriteAccess(boardId);
                const now = getNow();

                const counter =
                    await st.tx.boards.incrementBoardCounter(boardId);

                return await st.tx.tasks.create({
                    id: taskId,
                    authorId: meId,
                    boardId: boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    title: title,
                    counter,
                    columnPosition: toPosition(placement),
                    columnId,
                });
            },
        }),
        createColumn: handler({
            req: z.object({
                columnId: zUuid<ColumnId>(),
                boardId: zUuid<BoardId>(),
                title: z.string(),
            }),
            res: zColumn(),
            handle: async (st, {boardId, columnId, title}) => {
                const meId = st.ensureAuthenticated();
                await st.ensureBoardWriteAccess(boardId);
                const now = getNow();

                return await st.tx.columns.create({
                    id: columnId,
                    authorId: meId,
                    boardId: boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    title: title,
                });
            },
        }),
        createBoard: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
                key: z.string(),
            }),
            res: zBoard(),
            handle: async (st, req) => {
                const now = getNow();

                const userId = st.ensureAuthenticated();

                const board = await st.tx.boards.create({
                    id: req.boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    name: req.name,
                    ownerId: userId,
                    key: req.key,
                });
                await st.tx.members.create({
                    id: createMemberId(),
                    boardId: board.id,
                    createdAt: now,
                    updatedAt: now,
                    userId: userId,
                    deleted: false,
                });

                return board;
            },
        }),
        deleteBoard: handler({
            req: z.object({boardId: zUuid<BoardId>()}),
            res: z.object({}),
            handle: async (st, {boardId}) => {
                await st.ensureBoardOwner(boardId);
                await st.tx.boards.update(boardId, x => {
                    x.deleted = true;
                });
                return {};
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
