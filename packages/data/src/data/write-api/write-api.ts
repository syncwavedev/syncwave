import {z} from 'zod';
import {encodeBase64, zBase64} from '../../base64.js';
import {toBigFloat, zBigFloat} from '../../big-float.js';
import {parseCrdtDiff, zCrdtDiffBase64} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {getNow} from '../../timestamp.js';
import {createApi, handler, type InferRpcClient} from '../../transport/rpc.js';
import {whenAll} from '../../utils.js';
import {zUuid} from '../../uuid.js';
import type {DataTx} from '../data-layer.js';
import {
    toColumnDto,
    toCommentDto,
    toMemberDto,
    zColumnDto,
    zCommentDto,
    zMemberDto,
} from '../dto.js';
import {createObjectKey, type ObjectStore} from '../infrastructure.js';
import {PermissionService} from '../permission-service.js';
import {type Board, type BoardId, zBoard} from '../repos/board-repo.js';
import {type Card, type CardId, zCard} from '../repos/card-repo.js';
import {type Column, type ColumnId} from '../repos/column-repo.js';
import {type CommentId} from '../repos/comment-repo.js';
import {
    createMemberId,
    type Member,
    type MemberId,
    zMemberRole,
} from '../repos/member-repo.js';
import {type User, type UserId} from '../repos/user-repo.js';
import {writable} from '../transition-checker.js';

export class WriteApiState {
    constructor(
        public readonly tx: DataTx,
        public readonly objectStore: ObjectStore,
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
        createCard: handler({
            req: z.object({
                cardId: zUuid<CardId>(),
                boardId: zUuid<BoardId>(),
                columnId: zUuid<ColumnId>(),
                title: z.string(),
                columnPosition: zBigFloat(),
            }),
            res: zCard(),
            handle: async (
                st,
                {boardId, cardId, title, columnPosition, columnId}
            ) => {
                const meId = st.ps.ensureAuthenticated();
                await st.ps.ensureBoardMember(boardId, 'writer');
                const now = getNow();

                await st.ps.ensureColumnMember(columnId, 'writer');

                const counter =
                    await st.tx.boards.incrementBoardCounter(boardId);

                return await st.tx.cards.create({
                    id: cardId,
                    authorId: meId,
                    boardId: boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    title: title,
                    counter,
                    columnPosition,
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
                        version: '2',
                        // todo: add to the beginning of the user list
                        position: toBigFloat(Math.random()),
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
                boardPosition: zBigFloat(),
            }),
            res: zColumnDto(),
            handle: async (st, {boardId, columnId, title, boardPosition}) => {
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
                    boardPosition,
                    version: '3',
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
        deleteCard: handler({
            req: z.object({cardId: zUuid<CardId>()}),
            res: z.object({}),
            handle: async (st, {cardId}) => {
                await st.ps.ensureCardMember(cardId, 'writer');
                await st.tx.cards.update(
                    cardId,
                    x => {
                        x.deleted = true;
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
                    // todo: add to the beginning of the user list
                    position: toBigFloat(Math.random()),
                    version: '2',
                });

                return board;
            },
        }),
        deleteBoard: handler({
            req: z.object({boardId: zUuid<BoardId>()}),
            res: z.object({}),
            handle: async (st, {boardId}) => {
                await whenAll([
                    st.ps.ensureBoardMember(boardId, 'owner'),
                    st.tx.boards.update(boardId, x => {
                        x.deleted = true;
                    }),
                ]);
                return {};
            },
        }),
        applyBoardDiff: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                diff: zCrdtDiffBase64<Board>(),
            }),
            res: z.object({}),
            handle: async (st, {boardId, diff}) => {
                await whenAll([
                    st.ps.ensureBoardMember(boardId, 'admin'),
                    st.tx.boards.apply(
                        boardId,
                        parseCrdtDiff(diff),
                        writable({name: true})
                    ),
                ]);
                return {};
            },
        }),
        applyCardDiff: handler({
            req: z.object({
                cardId: zUuid<CardId>(),
                diff: zCrdtDiffBase64<Card>(),
            }),
            res: z.object({}),
            handle: async (st, {cardId, diff}) => {
                await whenAll([
                    st.ps.ensureCardMember(cardId, 'writer'),
                    (async () => {
                        const {before, after} = await st.tx.cards.apply(
                            cardId,
                            parseCrdtDiff(diff),
                            writable({
                                title: true,
                                columnId: true,
                            })
                        );
                        if (before?.columnId !== after.columnId) {
                            await st.ps.ensureColumnMember(
                                after.columnId,
                                'writer'
                            );
                        }
                    })(),
                ]);
                return {};
            },
        }),
        applyMemberDiff: handler({
            req: z.object({
                memberId: zUuid<MemberId>(),
                diff: zCrdtDiffBase64<Member>(),
            }),
            res: z.object({}),
            handle: async (st, {memberId, diff}) => {
                await whenAll([
                    st.ps.ensureMember(memberId),
                    st.tx.members.apply(
                        memberId,
                        parseCrdtDiff(diff),
                        writable({
                            position: true,
                        })
                    ),
                ]);
                return {};
            },
        }),
        applyColumnDiff: handler({
            req: z.object({
                columnId: zUuid<ColumnId>(),
                diff: zCrdtDiffBase64<Column>(),
            }),
            res: z.object({}),
            handle: async (st, {columnId, diff}) => {
                await whenAll([
                    st.ps.ensureColumnMember(columnId, 'writer'),
                    st.tx.columns.apply(
                        columnId,
                        parseCrdtDiff(diff),
                        writable({
                            boardPosition: true,
                            title: true,
                        })
                    ),
                ]);
                return {};
            },
        }),
        createComment: handler({
            req: z.object({
                cardId: zUuid<CardId>(),
                text: z.string(),
                commentId: zUuid<CommentId>(),
            }),
            res: zCommentDto(),
            handle: async (st, {cardId, text, commentId}) => {
                const now = getNow();
                await st.ps.ensureCardMember(cardId, 'writer');
                await st.tx.comments.create({
                    cardId,
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
        applyUserDiff: handler({
            req: z.object({
                userId: zUuid<UserId>(),
                diff: zCrdtDiffBase64<User>(),
            }),
            res: z.object({}),
            handle: async (st, {userId, diff}) => {
                await whenAll([
                    st.ps.ensureUser(userId),
                    st.tx.users.apply(
                        userId,
                        parseCrdtDiff(diff),
                        writable({fullName: true})
                    ),
                ]);
                return {};
            },
        }),
        setUserAvatar: handler({
            req: z.object({
                userId: zUuid<UserId>(),
                avatar: zBase64(),
                contentType: z.union([
                    z.literal('image/png'),
                    z.literal('image/jpeg'),
                ]),
            }),
            res: z.object({}),
            handle: async (st, {userId, avatar, contentType}) => {
                await st.ps.ensureUser(userId);
                const avatarKey = createObjectKey();
                await st.objectStore.put(avatarKey, encodeBase64(avatar), {
                    contentType,
                });
                await st.tx.users.update(userId, x => {
                    x.avatarKey = avatarKey;
                });
                return {};
            },
        }),
    });
}

export type WriteApiRpc = InferRpcClient<ReturnType<typeof createWriteApi>>;
