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
    toAttachmentDto,
    toColumnDto,
    toMemberDto,
    toMessageDto,
    zAttachmentDto,
    zColumnDto,
    zMemberDto,
    zMessageDto,
} from '../dto.js';
import {
    createObjectKey,
    type CryptoService,
    type EmailService,
    type ObjectMetadata,
    type ObjectStore,
} from '../infrastructure.js';
import {PermissionService} from '../permission-service.js';
import {createAttachmentId} from '../repos/attachment-repo.js';
import {type Board, type BoardId, zBoard} from '../repos/board-repo.js';
import {type Card, type CardId} from '../repos/card-repo.js';
import {type Column, type ColumnId} from '../repos/column-repo.js';
import {
    createMemberId,
    type Member,
    type MemberId,
    zMemberRole,
} from '../repos/member-repo.js';
import {type Message, type MessageId} from '../repos/message-repo.js';
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
        applyCardDiff: handler({
            req: Type.Object({
                cardId: Uuid<CardId>(),
                diff: zCrdtDiff<Card>(),
            }),
            res: Type.Object({}),
            handle: async (st, {cardId, diff}) => {
                const existingCard = await st.tx.cards.getById(cardId, true);
                if (existingCard) {
                    await whenAll([
                        st.ps.ensureCardMember(cardId, 'writer'),
                        (async () => {
                            const {before, after} = await st.tx.cards.apply(
                                cardId,
                                diff,
                                writable({
                                    text: true,
                                    columnId: true,
                                    columnPosition: true,
                                    deleted: true,
                                    updatedAt: true,
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
                const card = await st.tx.cards.getById(cardId, true);
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
                    deleted: false,
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
                    ...message.attachmentIds.map(id =>
                        st.ps.ensureAttachmentMember(id, 'reader')
                    ),
                    st.ps.ensureCardMember(message.cardId, 'writer'),
                ]);

                const card = await st.tx.cards.getById(message.cardId, true);
                if (!card) {
                    throw new BusinessError(
                        `card not found: ${message.cardId}`,
                        'card_not_found'
                    );
                }

                if (card.boardId !== message.boardId) {
                    throw new BusinessError(
                        `card ${message.cardId} doesn't belong to board ${message.boardId}`,
                        'forbidden'
                    );
                }

                if (message.replyToId) {
                    const replyTo = await st.tx.messages.getById(
                        message.replyToId,
                        true
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
                        deleted: expectBoolean(),
                        updatedAt: expectTimestamp(),
                        text: createRichtext(),
                        boardId: card.boardId,
                        attachmentIds: [],
                        replyToId: message.replyToId,
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
                name: Type.String(),
                boardPosition: zBigFloat(),
            }),
            res: zColumnDto(),
            handle: async (st, {boardId, columnId, name, boardPosition}) => {
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
                    name: name,
                    boardPosition,
                    version: '4',
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
                            name: true,
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
