import {Type} from '@sinclair/typebox';
import {encodeBase64, zBase64} from '../base64.js';
import {getAccount} from '../coordinator/auth-api.js';
import {Crdt, zCrdtDiff} from '../crdt/crdt.js';
import {createRichtext} from '../crdt/richtext.js';
import {BusinessError} from '../errors.js';
import {getNow} from '../timestamp.js';
import {createApi, handler, type InferRpcClient} from '../transport/rpc.js';
import {whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import type {DataTx} from './data-layer.js';
import {
    toAttachmentDto,
    toColumnDto,
    toMemberDto,
    toMessageDto,
    zAttachmentDto,
    zColumnDto,
    zMemberDto,
    zMessageDto,
} from './dto.js';
import {
    createObjectKey,
    type CryptoService,
    type EmailService,
    type ObjectMetadata,
    type ObjectStore,
} from './infrastructure.js';
import {PermissionService} from './permission-service.js';
import {createAttachmentId} from './repos/attachment-repo.js';
import {type Board, type BoardId, zBoard} from './repos/board-repo.js';
import {type Card, type CardId} from './repos/card-repo.js';
import {type Column, type ColumnId} from './repos/column-repo.js';
import {
    createMemberId,
    type Member,
    type MemberId,
    zMemberRole,
} from './repos/member-repo.js';
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
        applyCardDiff: handler({
            req: Type.Object({
                cardId: Uuid<CardId>(),
                diff: zCrdtDiff<Card>(),
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
            res: zAttachmentDto(),
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
                diff: zCrdtDiff<Message>(),
            }),
            res: zMessageDto(),
            handle: async (st, {diff}) => {
                const crdt = Crdt.load(diff);
                const message = crdt.snapshot();

                const meId = st.ps.ensureAuthenticated();

                await whenAll([
                    ...message.payload.attachmentIds.map(id =>
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

                if (message.payload.replyToId) {
                    const replyTo = await st.tx.messages.getById(
                        message.payload.replyToId,
                        {includeDeleted: true}
                    );
                    if (!replyTo) {
                        throw new BusinessError(
                            `message ${message.payload.replyToId} not found`,
                            'message_not_found'
                        );
                    }
                    if (replyTo.boardId !== message.boardId) {
                        throw new BusinessError(
                            `message ${message.payload.replyToId} doesn't belong to board ${message.boardId}`,
                            'forbidden'
                        );
                    }
                    if (replyTo.cardId !== message.cardId) {
                        throw new BusinessError(
                            `message ${message.payload.replyToId} doesn't belong to card ${message.cardId}`,
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
                            replyToId: message.payload.replyToId,
                            attachmentIds: [],
                        },
                        boardId: card.boardId,
                    })
                );

                return await toMessageDto(st.tx, after.id);
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

                const now = getNow();

                const existingMember =
                    await st.tx.members.getByUserIdAndBoardId(
                        account.userId,
                        boardId,
                        {includeDeleted: true}
                    );

                let member: Member;
                if (existingMember?.deletedAt) {
                    await st.ps.ensureCanManage(
                        existingMember.boardId,
                        existingMember.role
                    );
                    member = await st.tx.members.update(
                        existingMember.id,
                        x => {
                            x.deletedAt = undefined;
                            x.role = role;
                        },
                        {includeDeleted: true}
                    );
                } else {
                    member = await st.tx.members.create({
                        id: createMemberId(),
                        boardId,
                        userId: account.userId,
                        createdAt: now,
                        updatedAt: now,
                        role,
                        // todo: add to the beginning of the user list
                        position: Math.random(),
                    });
                }

                return await toMemberDto(st.tx, member.id);
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
                            'cannot remove last owner',
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
            res: zColumnDto(),
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
            res: zBoard(),
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
