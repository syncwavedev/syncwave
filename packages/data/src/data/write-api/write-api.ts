import {z} from 'zod';
import {zBigFloat} from '../../big-float.js';
import {parseCrdtDiff, zCrdtDiffString} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {getNow} from '../../timestamp.js';
import {createApi, handler, InferRpcClient} from '../../transport/rpc.js';
import {zUuid} from '../../uuid.js';
import {DataTx} from '../data-layer.js';
import {
    toColumnDto,
    toCommentDto,
    toMemberDto,
    zColumnDto,
    zCommentDto,
    zMemberDto,
} from '../dto.js';
import {PermissionService} from '../permission-service.js';
import {toPosition} from '../placement.js';
import {Board, BoardId, zBoard} from '../repos/board-repo.js';
import {ColumnId} from '../repos/column-repo.js';
import {CommentId} from '../repos/comment-repo.js';
import {
    createMemberId,
    Member,
    MemberId,
    zMemberRole,
} from '../repos/member-repo.js';
import {TaskId, zTask} from '../repos/task-repo.js';
import {UserId} from '../repos/user-repo.js';

export class WriteApiState {
    constructor(
        public tx: DataTx,
        public readonly ps: PermissionService
    ) {}

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
}

export function createWriteApi() {
    return createApi<WriteApiState>()({
        createTask: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                boardId: zUuid<BoardId>(),
                columnId: zUuid<ColumnId>(),
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
                const meId = st.ps.ensureAuthenticated();
                await st.ps.ensureBoardMember(boardId, 'writer');
                const now = getNow();

                await st.ps.ensureColumnMember(columnId, 'writer');

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
        createMember: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                email: z.string(),
                role: zMemberRole(),
            }),
            res: zMemberDto(),
            handle: async (st, {boardId, email, role}) => {
                await st.ps.ensureCanManage(boardId, role);

                const identity = await st.tx.identities.getByEmail(email);

                if (!identity) {
                    throw new BusinessError(
                        `user with email ${email} not found`,
                        'user_not_found'
                    );
                }

                const now = getNow();

                const existingMember =
                    await st.tx.members.getByUserIdAndBoardId(
                        identity.userId,
                        boardId,
                        true
                    );

                let member: Member;
                if (existingMember?.deleted) {
                    await st.ps.ensureCanManage(
                        existingMember.boardId,
                        existingMember.role
                    );
                    member = await st.tx.members.update(
                        existingMember.id,
                        x => {
                            x.deleted = false;
                            x.role = role;
                        },
                        true
                    );
                } else {
                    member = await st.tx.members.create({
                        id: createMemberId(),
                        boardId,
                        userId: identity.userId,
                        createdAt: now,
                        updatedAt: now,
                        deleted: false,
                        role,
                    });
                }

                return await toMemberDto(st.tx, member.id);
            },
        }),
        deleteMember: handler({
            req: z.object({memberId: zUuid<MemberId>()}),
            res: z.object({}),
            handle: async (st, {memberId}) => {
                const member = await st.tx.members.getById(memberId, true);

                if (!member) {
                    throw new BusinessError(
                        `member ${memberId} not found`,
                        'member_not_found'
                    );
                }

                await st.ps.ensureCanManage(member.boardId, member.role);
                await st.tx.members.update(
                    memberId,
                    x => {
                        x.deleted = true;
                    },
                    true
                );

                return {};
            },
        }),
        createColumn: handler({
            req: z.object({
                columnId: zUuid<ColumnId>(),
                boardId: zUuid<BoardId>(),
                title: z.string(),
            }),
            res: zColumnDto(),
            handle: async (st, {boardId, columnId, title}) => {
                const meId = st.ps.ensureAuthenticated();
                await st.ps.ensureBoardMember(boardId, 'writer');
                const now = getNow();

                const column = await st.tx.columns.create({
                    id: columnId,
                    authorId: meId,
                    boardId: boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    title: title,
                });

                return await toColumnDto(st.tx, column.id);
            },
        }),
        deleteColumn: handler({
            req: z.object({columnId: zUuid<ColumnId>()}),
            res: z.object({}),
            handle: async (st, {columnId}) => {
                await st.ps.ensureColumnMember(columnId, 'writer');
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
                await st.ps.ensureTaskMember(taskId, 'writer');
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
                await st.ps.ensureTaskMember(taskId, 'writer');
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
                columnId: zUuid<ColumnId>(),
            }),
            res: z.object({}),
            handle: async (st, {taskId, columnId}) => {
                await st.ps.ensureTaskMember(taskId, 'writer');

                if (columnId) {
                    await st.ps.ensureColumnMember(columnId, 'writer');
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
                await st.ps.ensureColumnMember(columnId, 'writer');
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

                const userId = st.ps.ensureAuthenticated();

                const board = await st.tx.boards.create({
                    id: req.boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    name: req.name,
                    authorId: userId,
                    key: req.key.toUpperCase(),
                });
                await st.tx.members.create({
                    id: createMemberId(),
                    boardId: board.id,
                    createdAt: now,
                    updatedAt: now,
                    userId: userId,
                    deleted: false,
                    role: 'owner',
                });

                return board;
            },
        }),
        deleteBoard: handler({
            req: z.object({boardId: zUuid<BoardId>()}),
            res: z.object({}),
            handle: async (st, {boardId}) => {
                await st.ps.ensureBoardMember(boardId, 'owner');
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
                await st.ps.ensureBoardMember(boardId, 'admin');
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
        applyBoardDiff: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                diff: zCrdtDiffString<Board>(),
            }),
            res: z.object({}),
            handle: async (st, {boardId, diff}) => {
                await st.ps.ensureBoardMember(boardId, 'admin');
                await st.tx.boards.apply(boardId, parseCrdtDiff(diff));
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
                await st.ps.ensureTaskMember(taskId, 'writer');
                await st.tx.comments.create({
                    taskId,
                    text,
                    authorId: st.ps.ensureAuthenticated(),
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
                await st.ps.ensureCommentMember(commentId, 'writer');
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
        setUserFullName: handler({
            req: z.object({
                userId: zUuid<UserId>(),
                fullName: z.string(),
            }),
            res: z.object({}),
            handle: async (st, {userId, fullName}) => {
                await st.ps.ensureUser(userId);
                await st.tx.users.update(
                    userId,
                    x => {
                        x.fullName = fullName;
                    },
                    true
                );

                return {};
            },
        }),
    });
}

export type WriteApiRpc = InferRpcClient<ReturnType<typeof createWriteApi>>;
