import {Type} from '@sinclair/typebox';
import {encodeBase64, zBase64} from '../../base64.js';
import {toBigFloat, zBigFloat} from '../../big-float.js';
import {getIdentity} from '../../coordinator/auth-api.js';
import {Crdt, zCrdtDiff} from '../../crdt/crdt.js';
import {createRichtext} from '../../crdt/richtext.js';
import {BusinessError} from '../../errors.js';
import {getNow} from '../../timestamp.js';
import {createApi, handler, type InferRpcClient} from '../../transport/rpc.js';
import {whenAll} from '../../utils.js';
import {Uuid} from '../../uuid.js';
import type {DataTx} from '../data-layer.js';
import {
    toColumnDto,
    toCommentDto,
    toMemberDto,
    zColumnDto,
    zCommentDto,
    zMemberDto,
} from '../dto.js';
import {
    createObjectKey,
    type CryptoService,
    type EmailService,
    type ObjectStore,
} from '../infrastructure.js';
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
import {
    creatable,
    expectBoolean,
    expectTimestamp,
    writable,
} from '../transition-checker.js';

export class WriteApiState {
    constructor(
        public readonly tx: DataTx,
        public readonly objectStore: ObjectStore,
        public readonly ps: PermissionService,
        public readonly crypto: CryptoService,
        public readonly email: EmailService
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
            req: Type.Object({
                diff: zCrdtDiff<Card>(),
            }),
            res: zCard(),
            handle: async (st, {diff}) => {
                const crdt = Crdt.load(diff);
                const card = crdt.snapshot();

                const meId = st.ps.ensureAuthenticated();
                await st.ps.ensureBoardMember(card.boardId, 'writer');
                await st.ps.ensureColumnMember(card.columnId, 'writer');

                const counter = await st.tx.boards.incrementBoardCounter(
                    card.boardId
                );

                crdt.update(draft => {
                    draft.counter = counter;
                });

                const {after} = await st.tx.cards.apply(
                    card.id,
                    crdt.state(),
                    creatable<Card>({
                        id: card.id,
                        pk: [card.id],
                        authorId: meId,
                        boardId: card.boardId,
                        columnId: card.columnId,
                        counter,
                        columnPosition: card.columnPosition,
                        createdAt: expectTimestamp(),
                        deleted: expectBoolean(),
                        updatedAt: expectTimestamp(),
                        text: createRichtext(),
                    })
                );

                return after;
            },
        }),
        createMember: handler({
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                email: Type.String(),
                role: zMemberRole(),
            }),
            res: zMemberDto(),
            handle: async (st, {boardId, email, role}) => {
                await st.ps.ensureCanManage(boardId, role);

                const identity = await getIdentity({
                    email,
                    crypto: st.crypto,
                    fullName: undefined,
                    identities: st.tx.identities,
                    users: st.tx.users,
                });

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
            req: Type.Object({memberId: Uuid<MemberId>()}),
            res: Type.Object({}),
            handle: async (st, {memberId}) => {
                const member = await st.tx.members.getById(memberId, true);

                if (!member) {
                    throw new BusinessError(
                        `member ${memberId} not found`,
                        'member_not_found'
                    );
                }

                await st.ps.ensureCanManage(member.boardId, member.role);
                if (member.role === 'owner') {
                    const allMembers = await st.tx.members
                        .getByBoardId(member.boardId)
                        .filter(x => x.role === 'owner')
                        .toArray();

                    if (allMembers.length === 1) {
                        throw new BusinessError(
                            'cannot remove last owner',
                            'last_owner'
                        );
                    }
                }

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
            req: Type.Object({
                columnId: Uuid<ColumnId>(),
                boardId: Uuid<BoardId>(),
                title: Type.String(),
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
            req: Type.Object({columnId: Uuid<ColumnId>()}),
            res: Type.Object({}),
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
            req: Type.Object({cardId: Uuid<CardId>()}),
            res: Type.Object({}),
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
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                name: Type.String(),
                key: Type.String(),
                members: Type.Array(Type.String()),
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

                await whenAll([
                    st.tx.members.create({
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
                    }),
                    ...req.members.map(async member => {
                        const identity = await getIdentity({
                            identities: st.tx.identities,
                            crypto: st.crypto,
                            email: member,
                            fullName: undefined,
                            users: st.tx.users,
                        });

                        await st.tx.members.create({
                            boardId: board.id,
                            createdAt: now,
                            deleted: false,
                            id: createMemberId(),
                            position: toBigFloat(Math.random()),
                            role: 'writer',
                            updatedAt: now,
                            userId: identity.userId,
                            version: '2',
                        });
                    }),
                ]);

                return board;
            },
        }),
        deleteBoard: handler({
            req: Type.Object({boardId: Uuid<BoardId>()}),
            res: Type.Object({}),
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
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                diff: zCrdtDiff<Board>(),
            }),
            res: Type.Object({}),
            handle: async (st, {boardId, diff}) => {
                await whenAll([
                    st.ps.ensureBoardMember(boardId, 'admin'),
                    st.tx.boards.apply(boardId, diff, writable({name: true})),
                ]);
                return {x: null};
            },
        }),
        applyCardDiff: handler({
            req: Type.Object({
                cardId: Uuid<CardId>(),
                diff: zCrdtDiff<Card>(),
            }),
            res: Type.Object({}),
            handle: async (st, {cardId, diff}) => {
                await whenAll([
                    st.ps.ensureCardMember(cardId, 'writer'),
                    (async () => {
                        const {before, after} = await st.tx.cards.apply(
                            cardId,
                            diff,
                            writable({
                                text: true,
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
            req: Type.Object({
                memberId: Uuid<MemberId>(),
                diff: zCrdtDiff<Member>(),
            }),
            res: Type.Object({}),
            handle: async (st, {memberId, diff}) => {
                await whenAll([
                    st.ps.ensureMember(memberId),
                    st.tx.members.apply(
                        memberId,
                        diff,
                        writable({
                            position: true,
                        })
                    ),
                ]);
                return {};
            },
        }),
        applyColumnDiff: handler({
            req: Type.Object({
                columnId: Uuid<ColumnId>(),
                diff: zCrdtDiff<Column>(),
            }),
            res: Type.Object({}),
            handle: async (st, {columnId, diff}) => {
                await whenAll([
                    st.ps.ensureColumnMember(columnId, 'writer'),
                    st.tx.columns.apply(
                        columnId,
                        diff,
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
            req: Type.Object({
                cardId: Uuid<CardId>(),
                text: Type.String(),
                commentId: Uuid<CommentId>(),
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
            req: Type.Object({commentId: Uuid<CommentId>()}),
            res: Type.Object({}),
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
            req: Type.Object({
                userId: Uuid<UserId>(),
                diff: zCrdtDiff<User>(),
            }),
            res: Type.Object({}),
            handle: async (st, {userId, diff}) => {
                await whenAll([
                    st.ps.ensureUser(userId),
                    st.tx.users.apply(userId, diff, writable({fullName: true})),
                ]);
                return {};
            },
        }),
        setUserAvatar: handler({
            req: Type.Object({
                userId: Uuid<UserId>(),
                avatar: zBase64(),
                contentType: Type.Union([
                    Type.Literal('image/png'),
                    Type.Literal('image/jpeg'),
                ]),
            }),
            res: Type.Object({}),
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
