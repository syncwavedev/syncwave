import {z} from 'zod';
import {zBigFloat} from '../../big-float.js';
import {BusinessError} from '../../errors.js';
import {getNow} from '../../timestamp.js';
import {createApi, handler, InferRpcClient} from '../../transport/rpc.js';
import {zUuid} from '../../uuid.js';
import {AuthContext} from '../auth-context.js';
import {DataTx} from '../data-layer.js';
import {toCommentDto, zCommentDto} from '../dto.js';
import {toPosition} from '../placement.js';
import {Board, BoardId, zBoard} from '../repos/board-repo.js';
import {ColumnId, zColumn} from '../repos/column-repo.js';
import {CommentId} from '../repos/comment-repo.js';
import {createMemberId, Member} from '../repos/member-repo.js';
import {TaskId, zTask} from '../repos/task-repo.js';
import {UserId} from '../repos/user-repo.js';

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
        const column = await this.tx.columns.getById(columnId, true);

        if (!column) {
            throw new BusinessError(
                `column ${columnId} doesn't exist`,
                'column_not_found'
            );
        }
        return await this.ensureBoardWriteAccess(column.boardId);
    }

    async ensureTaskWriteAccess(taskId: TaskId): Promise<Member> {
        const task = await this.tx.tasks.getById(taskId, true);

        if (!task) {
            throw new BusinessError(
                `task ${taskId} doesn't exist`,
                'task_not_found'
            );
        }
        return await this.ensureBoardWriteAccess(task.boardId);
    }

    async ensureCommentWriteAccess(commentId: CommentId): Promise<Member> {
        const comment = await this.tx.comments.getById(commentId, true);

        if (!comment) {
            throw new BusinessError(
                `comment ${commentId} doesn't exist`,
                'comment_not_found'
            );
        }
        return await this.ensureTaskWriteAccess(comment.taskId);
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

                if (columnId) {
                    await st.ensureColumnWriteAccess(columnId);
                }

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
        deleteColumn: handler({
            req: z.object({columnId: zUuid<ColumnId>()}),
            res: z.object({}),
            handle: async (st, {columnId}) => {
                await st.ensureColumnWriteAccess(columnId);
                await st.tx.columns.update(
                    columnId,
                    x => {
                        x.deleted = true;
                    },
                    true
                );

                return {};
            },
        }),
        deleteTask: handler({
            req: z.object({taskId: zUuid<TaskId>()}),
            res: z.object({}),
            handle: async (st, {taskId}) => {
                await st.ensureTaskWriteAccess(taskId);
                await st.tx.tasks.update(
                    taskId,
                    x => {
                        x.deleted = true;
                    },
                    true
                );

                return {};
            },
        }),
        setTaskTitle: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                title: z.string(),
            }),
            res: z.object({}),
            handle: async (st, {taskId, title}) => {
                await st.ensureTaskWriteAccess(taskId);
                await st.tx.tasks.update(
                    taskId,
                    x => {
                        x.title = title;
                    },
                    true
                );

                return {};
            },
        }),
        setTaskColumnId: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                columnId: zUuid<ColumnId>().nullable(),
            }),
            res: z.object({}),
            handle: async (st, {taskId, columnId}) => {
                await st.ensureTaskWriteAccess(taskId);

                if (columnId) {
                    await st.ensureColumnWriteAccess(columnId);
                }
                await st.tx.tasks.update(
                    taskId,
                    x => {
                        x.columnId = columnId;
                    },
                    true
                );

                return {};
            },
        }),
        setColumnTitle: handler({
            req: z.object({
                columnId: zUuid<ColumnId>(),
                title: z.string(),
            }),
            res: z.object({}),
            handle: async (st, {columnId, title}) => {
                await st.ensureColumnWriteAccess(columnId);
                await st.tx.columns.update(
                    columnId,
                    x => {
                        x.title = title;
                    },
                    true
                );

                return {};
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
                    key: req.key.toUpperCase(),
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
        setBoardName: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
            }),
            res: z.object({}),
            handle: async (st, {boardId, name}) => {
                await st.ensureBoardWriteAccess(boardId);
                await st.tx.boards.update(
                    boardId,
                    draft => {
                        draft.name = name;
                    },
                    true
                );

                return {};
            },
        }),
        createComment: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                text: z.string(),
                commentId: zUuid<CommentId>(),
            }),
            res: zCommentDto(),
            handle: async (st, {taskId, text, commentId}) => {
                const now = getNow();
                await st.ensureTaskWriteAccess(taskId);
                await st.tx.comments.create({
                    taskId,
                    text,
                    authorId: st.ensureAuthenticated(),
                    deleted: false,
                    id: commentId,
                    createdAt: now,
                    updatedAt: now,
                });

                return await toCommentDto(st.tx, commentId);
            },
        }),
        deleteComment: handler({
            req: z.object({commentId: zUuid<CommentId>()}),
            res: z.object({}),
            handle: async (st, {commentId}) => {
                await st.ensureCommentWriteAccess(commentId);
                await st.tx.comments.update(
                    commentId,
                    x => {
                        x.deleted = true;
                    },
                    true
                );

                return {};
            },
        }),
    });
}

export type WriteApiRpc = InferRpcClient<ReturnType<typeof createWriteApi>>;
