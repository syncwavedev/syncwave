import {Type} from '@sinclair/typebox';
import {Base64, encodeBase64} from '../base64.js';
import {getAccount} from '../coordinator/auth-api.js';
import {Crdt, CrdtDiff} from '../crdt/crdt.js';
import {createRichtext} from '../crdt/richtext.js';
import {BusinessError} from '../errors.js';
import {getNow} from '../timestamp.js';
import {createApi, handler, type InferRpcClient} from '../transport/rpc.js';
import {assert, whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import type {BoardService} from './board-service.js';
import type {DataTx} from './data-layer.js';
import {
    AttachmentDto,
    ColumnDto,
    MemberDto,
    MessageDto,
    toAttachmentDto,
    toColumnDto,
    toMemberDto,
    toMessageDto,
} from './dto.js';
import {
    createObjectKey,
    type CryptoProvider,
    type JwtProvider,
    type ObjectMetadata,
    type ObjectStore,
} from './infrastructure.js';
import type {MemberService} from './member-service.js';
import {PermissionService} from './permission-service.js';
import {createAttachmentId} from './repos/attachment-repo.js';
import {Board, type BoardId} from './repos/board-repo.js';
import {type Card, type CardId} from './repos/card-repo.js';
import {type Column, type ColumnId} from './repos/column-repo.js';
import {type Member, type MemberId, MemberRole} from './repos/member-repo.js';
import {type Message, type MessageId} from './repos/message-repo.js';
import {type User, type UserId} from './repos/user-repo.js';
import {
    creatable,
    expectOptional,
    expectTimestamp,
    writable,
} from './transition-checker.js';

export class WriteApiState {
    constructor(
        public readonly tx: DataTx,
        public readonly objectStore: ObjectStore,
        public readonly ps: PermissionService,
        public readonly crypto: CryptoProvider,
        public readonly boardService: BoardService,
        public readonly jwtService: JwtProvider,
        public readonly memberService: MemberService
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
        applyMessageDiff: handler({
            req: Type.Object({
                messageId: Uuid<MessageId>(),
                diff: CrdtDiff<Message>(),
            }),
            res: Type.Object({}),
            handle: async (st, {messageId, diff}) => {
                const existingMessage = await st.tx.messages.getById(
                    messageId,
                    {includeDeleted: true}
                );
                if (existingMessage) {
                    throw new BusinessError(
                        'message edit is not allowed',
                        'forbidden'
                    );
                } else {
                    const crdt = Crdt.load(diff);
                    const message = crdt.snapshot();

                    const meId = st.ps.ensureAuthenticated();
                    await st.ps.ensureBoardMember(message.boardId, 'writer');
                    await st.ps.ensureColumnMember(message.columnId, 'writer');
                    await st.ps.ensureCardMember(message.cardId, 'writer');

                    const card = await st.tx.cards.getById(message.cardId, {
                        includeDeleted: true,
                    });
                    if (!card) {
                        throw new BusinessError(
                            `card not found: ${message.cardId}`,
                            'card_not_found'
                        );
                    }
                    if (card.boardId !== message.boardId) {
                        throw new BusinessError(
                            `card ${message.columnId} doesn't belong to column ${card.columnId}`,
                            'forbidden'
                        );
                    }

                    const column = await st.tx.columns.getById(
                        message.columnId,
                        {includeDeleted: true}
                    );
                    if (!column) {
                        throw new BusinessError(
                            `column not found: ${message.columnId}`,
                            'column_not_found'
                        );
                    }
                    if (column.boardId !== message.boardId) {
                        throw new BusinessError(
                            `column ${message.columnId} doesn't belong to board ${message.boardId}`,
                            'forbidden'
                        );
                    }

                    await st.tx.messages.apply(
                        message.id,
                        crdt.state(),
                        creatable<Message>({
                            id: message.id,
                            pk: [message.id],
                            authorId: meId,
                            boardId: message.boardId,
                            columnId: message.columnId,
                            cardId: message.cardId,
                            replyToId: message.replyToId,
                            attachmentIds: message.attachmentIds,
                            target: message.target,
                            createdAt: expectTimestamp(),
                            deletedAt: expectOptional(expectTimestamp()),
                            updatedAt: expectTimestamp(),
                            payload: {
                                type: 'text',
                                text: createRichtext(),
                            },
                        })
                    );

                    return {};
                }
            },
        }),
        applyCardDiff: handler({
            req: Type.Object({
                cardId: Uuid<CardId>(),
                diff: CrdtDiff<Card>(),
            }),
            res: Type.Object({}),
            handle: async (st, {cardId, diff}) => {
                const existingCard = await st.tx.cards.getById(cardId, {
                    includeDeleted: true,
                });
                if (existingCard) {
                    await whenAll([
                        st.ps.ensureCardMember(cardId, 'writer'),
                        (async () => {
                            const {before, after} = await st.tx.cards.apply(
                                cardId,
                                diff,
                                writable<Card>({
                                    text: true,
                                    columnId: true,
                                    position: true,
                                    deletedAt: true,
                                    updatedAt: true,
                                    assigneeId: true,
                                    id: false,
                                    authorId: false,
                                    boardId: false,
                                    counter: false,
                                    pk: false,
                                    createdAt: false,
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
                } else {
                    const crdt = Crdt.load(diff);
                    const card = crdt.snapshot();

                    const meId = st.ps.ensureAuthenticated();
                    await st.ps.ensureBoardMember(card.boardId, 'writer');
                    await st.ps.ensureColumnMember(card.columnId, 'writer');
                    const column = await st.tx.columns.getById(card.columnId, {
                        includeDeleted: true,
                    });
                    if (!column) {
                        throw new BusinessError(
                            `column not found: ${card.columnId}`,
                            'column_not_found'
                        );
                    }
                    if (column.boardId !== card.boardId) {
                        throw new BusinessError(
                            `column ${card.columnId} doesn't belong to board ${card.boardId}`,
                            'forbidden'
                        );
                    }
                    if (card.assigneeId) {
                        const assigneeMember =
                            await st.tx.members.getByUserIdAndBoardId(
                                card.assigneeId,
                                card.boardId,
                                {includeDeleted: true}
                            );

                        if (!assigneeMember) {
                            throw new BusinessError(
                                `user ${card.assigneeId} is not a member of board ${card.boardId}`,
                                'forbidden'
                            );
                        }
                    }

                    const counter = await st.tx.boards.incrementBoardCounter(
                        card.boardId
                    );

                    crdt.update(draft => {
                        draft.counter = counter;
                    });

                    await st.tx.cards.apply(
                        card.id,
                        crdt.state(),
                        creatable<Card>({
                            id: card.id,
                            pk: [card.id],
                            authorId: meId,
                            boardId: card.boardId,
                            columnId: card.columnId,
                            counter,
                            assigneeId: card.assigneeId,
                            position: card.position,
                            createdAt: expectTimestamp(),
                            deletedAt: expectOptional(expectTimestamp()),
                            updatedAt: expectTimestamp(),
                            text: createRichtext(),
                        })
                    );

                    return {};
                }
            },
        }),
        createAttachment: handler({
            req: Type.Object({
                cardId: Uuid<CardId>(),
                data: Type.Uint8Array(),
                fileName: Type.String(),
                contentType: Type.String(),
            }),
            res: AttachmentDto(),
            handle: async (st, {cardId, data, contentType}) => {
                const meId = st.ps.ensureAuthenticated();
                await st.ps.ensureCardMember(cardId, 'writer');
                const card = await st.tx.cards.getById(cardId, {
                    includeDeleted: true,
                });
                if (!card) {
                    throw new BusinessError(
                        `card not found: ${cardId}`,
                        'card_not_found'
                    );
                }
                const now = getNow();

                const objectKey = createObjectKey();
                const metadata: ObjectMetadata = {contentType};
                await st.objectStore.put(objectKey, data, metadata);

                const attachment = await st.tx.attachments.create({
                    authorId: meId,
                    boardId: card.boardId,
                    cardId,
                    columnId: card.columnId,
                    createdAt: now,
                    id: createAttachmentId(),
                    objectKey,
                    updatedAt: now,
                    metadata,
                });

                return toAttachmentDto(st.tx, attachment.id);
            },
        }),
        createMessage: handler({
            req: Type.Object({
                diff: CrdtDiff<Message>(),
            }),
            res: MessageDto(),
            handle: async (st, {diff}) => {
                const crdt = Crdt.load(diff);
                const message = crdt.snapshot();

                const meId = st.ps.ensureAuthenticated();

                await whenAll([
                    ...message.attachmentIds.map(id =>
                        st.ps.ensureAttachmentMember(id, 'reader')
                    ),
                    st.ps.ensureCardMember(message.cardId, 'writer'),
                ]);

                const card = await st.tx.cards.getById(message.cardId, {
                    includeDeleted: true,
                });
                if (!card) {
                    throw new BusinessError(
                        `card not found: ${message.cardId}`,
                        'card_not_found'
                    );
                }

                if (card.boardId !== message.boardId) {
                    throw new BusinessError(
                        `card ${message.columnId} doesn't belong to column ${card.columnId}`,
                        'forbidden'
                    );
                }

                if (card.columnId !== message.columnId) {
                    throw new BusinessError(
                        `card ${message.cardId} doesn't belong to board ${card.boardId}`,
                        'forbidden'
                    );
                }

                if (message.replyToId) {
                    const replyTo = await st.tx.messages.getById(
                        message.replyToId,
                        {includeDeleted: true}
                    );
                    if (!replyTo) {
                        throw new BusinessError(
                            `message ${message.replyToId} not found`,
                            'message_not_found'
                        );
                    }
                    if (replyTo.boardId !== message.boardId) {
                        throw new BusinessError(
                            `message ${message.replyToId} doesn't belong to board ${message.boardId}`,
                            'forbidden'
                        );
                    }
                    if (replyTo.cardId !== message.cardId) {
                        throw new BusinessError(
                            `message ${message.replyToId} doesn't belong to card ${message.cardId}`,
                            'forbidden'
                        );
                    }
                }

                const {after} = await st.tx.messages.apply(
                    message.id,
                    crdt.state(),
                    creatable<Message>({
                        id: message.id,
                        pk: [message.id],
                        authorId: meId,
                        cardId: message.cardId,
                        createdAt: expectTimestamp(),
                        deletedAt: expectOptional(expectTimestamp()),
                        updatedAt: expectTimestamp(),
                        target: 'card',
                        columnId: message.columnId,
                        payload: {
                            type: 'text',
                            text: createRichtext(),
                        },
                        boardId: card.boardId,
                        replyToId: message.replyToId,
                        attachmentIds: [],
                    })
                );

                return await toMessageDto(st.tx, after.id);
            },
        }),
        createMember: handler({
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                email: Type.String(),
                role: MemberRole(),
            }),
            res: MemberDto(),
            handle: async (st, {boardId, email, role}) => {
                await st.ps.ensureCanManage(boardId, role);

                const account = await getAccount({
                    email,
                    crypto: st.crypto,
                    fullName: undefined,
                    accounts: st.tx.accounts,
                    users: st.tx.users,
                    boardService: st.tx.boardService,
                });

                if (!account) {
                    throw new BusinessError(
                        `user with email ${email} not found`,
                        'user_not_found'
                    );
                }

                const member = await st.memberService.joinBoard({
                    account,
                    boardId,
                    role,
                });

                return await toMemberDto(st.tx, member.id);
            },
        }),
        joinByCode: handler({
            req: Type.Object({
                code: Type.String(),
            }),
            res: Type.Object({boardKey: Type.String()}),
            handle: async (st, {code}) => {
                const board = await st.tx.boards.getByJoinCode(code);
                if (!board) {
                    throw new BusinessError(
                        `board with join code ${code} not found`,
                        'board_not_found'
                    );
                }

                const account = await st.tx.accounts.getByUserId(
                    st.ps.ensureAuthenticated()
                );
                assert(account !== undefined, 'account not found');

                await st.memberService.joinBoard({
                    account,
                    boardId: board.id,
                    role: board.joinRole,
                });

                return {boardKey: board.key};
            },
        }),
        declineInvite: handler({
            req: Type.Object({
                memberId: Uuid<MemberId>(),
            }),
            res: Type.Object({}),
            handle: async (st, {memberId}) => {
                const member = await st.tx.members.getById(memberId, {
                    includeDeleted: true,
                });

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
                        x.deletedAt = getNow();
                    },
                    {includeDeleted: true}
                );

                return {};
            },
        }),
        deleteMember: handler({
            req: Type.Object({memberId: Uuid<MemberId>()}),
            res: Type.Object({}),
            handle: async (st, {memberId}) => {
                const member = await st.tx.members.getById(memberId, {
                    includeDeleted: true,
                });

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
                            'cannot remove the last owner',
                            'last_owner'
                        );
                    }
                }

                await st.tx.members.update(
                    memberId,
                    x => {
                        x.deletedAt = getNow();
                    },
                    {includeDeleted: true}
                );

                return {};
            },
        }),
        createColumn: handler({
            req: Type.Object({
                columnId: Uuid<ColumnId>(),
                boardId: Uuid<BoardId>(),
                name: Type.String(),
                position: Type.Number(),
            }),
            res: ColumnDto(),
            handle: async (st, {boardId, columnId, name, position}) => {
                const meId = st.ps.ensureAuthenticated();
                await st.ps.ensureBoardMember(boardId, 'writer');
                const now = getNow();

                const column = await st.tx.columns.create({
                    id: columnId,
                    authorId: meId,
                    boardId: boardId,
                    createdAt: now,
                    updatedAt: now,
                    name: name,
                    position,
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
                        x.deletedAt = getNow();
                    },
                    {includeDeleted: true}
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
                        x.deletedAt = getNow();
                    },
                    {includeDeleted: true}
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
            res: Board(),
            handle: async (st, req) => {
                return await st.tx.boardService.createBoard({
                    authorId: st.ps.ensureAuthenticated(),
                    name: req.name,
                    key: req.key,
                    members: req.members,
                    boardId: req.boardId,
                });
            },
        }),
        deleteBoard: handler({
            req: Type.Object({boardId: Uuid<BoardId>()}),
            res: Type.Object({}),
            handle: async (st, {boardId}) => {
                await whenAll([
                    st.ps.ensureBoardMember(boardId, 'owner'),
                    st.tx.boards.update(boardId, x => {
                        x.deletedAt = getNow();
                    }),
                ]);
                return {};
            },
        }),
        applyBoardDiff: handler({
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                diff: CrdtDiff<Board>(),
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
        applyMemberDiff: handler({
            req: Type.Object({
                memberId: Uuid<MemberId>(),
                diff: CrdtDiff<Member>(),
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
                diff: CrdtDiff<Column>(),
            }),
            res: Type.Object({}),
            handle: async (st, {columnId, diff}) => {
                const existingColumn = await st.tx.columns.getById(columnId, {
                    includeDeleted: true,
                });
                if (existingColumn) {
                    await whenAll([
                        st.ps.ensureColumnMember(columnId, 'writer'),
                        st.tx.columns.apply(
                            columnId,
                            diff,
                            writable<Column>({
                                position: true,
                                name: true,
                                deletedAt: true,
                                id: false,
                                authorId: false,
                                boardId: false,
                                pk: false,
                                createdAt: false,
                                updatedAt: false,
                            })
                        ),
                    ]);
                } else {
                    const crdt = Crdt.load(diff);
                    const column = crdt.snapshot();

                    const meId = st.ps.ensureAuthenticated();
                    await st.ps.ensureBoardMember(column.boardId, 'writer');

                    await st.tx.columns.apply(
                        column.id,
                        crdt.state(),
                        creatable<Column>({
                            id: column.id,
                            pk: [column.id],
                            name: column.name,
                            position: column.position,
                            authorId: meId,
                            boardId: column.boardId,
                            createdAt: expectTimestamp(),
                            deletedAt: expectOptional(expectTimestamp()),
                            updatedAt: expectTimestamp(),
                        })
                    );

                    return {};
                }
                return {};
            },
        }),
        deleteMessage: handler({
            req: Type.Object({messageId: Uuid<MessageId>()}),
            res: Type.Object({}),
            handle: async (st, {messageId}) => {
                await st.ps.ensureMessageMember(messageId, 'writer');
                await st.tx.messages.update(
                    messageId,
                    x => {
                        x.deletedAt = getNow();
                    },
                    {includeDeleted: true}
                );

                return {};
            },
        }),
        applyUserDiff: handler({
            req: Type.Object({
                userId: Uuid<UserId>(),
                diff: CrdtDiff<User>(),
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
                avatar: Base64(),
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
