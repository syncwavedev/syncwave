import {Type} from '@sinclair/typebox';
import {Base64, encodeBase64} from '../base64.js';
import {ONE_YEAR_MS} from '../constants.js';
import {getAccount} from '../coordinator/auth-api.js';
import {Crdt, CrdtDiff} from '../crdt/crdt.js';
import {createRichtext} from '../crdt/richtext.js';
import {BusinessError} from '../errors.js';
import {getNow} from '../timestamp.js';
import {createApi, handler, type InferRpcClient} from '../transport/rpc.js';
import {assert, whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import type {BoardService} from './board-service.js';
import {type DataTx} from './data-layer.js';
import {AttachmentDto, toAttachmentDto} from './dto.js';
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
import {MemberId, MemberRole, type Member} from './repos/member-repo.js';
import {type Message, type MessageId} from './repos/message-repo.js';
import {User, type UserId} from './repos/user-repo.js';
import {BOARD_DEMO_TEMPLATE, NEW_BOARD_TEMPLATE} from './template.js';
import {
    creatable,
    expectOptional,
    expectString,
    expectTimestamp,
    expectUnion,
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
                const existingMessage = await st.tx.messages.getById(messageId);
                if (existingMessage) {
                    await whenAll([
                        st.ps.ensureMessageAuthorOrBoardOwner(messageId),
                        (async () => {
                            await st.tx.messages.apply(
                                messageId,
                                diff,
                                writable<Message>({
                                    id: false,
                                    pk: false,
                                    authorId: false,
                                    boardId: false,
                                    columnId: false,
                                    cardId: false,
                                    replyToId: false,
                                    attachmentIds: false,
                                    target: false,
                                    createdAt: false,
                                    updatedAt: true,
                                    payload: false,
                                    deletedAt: true,
                                })
                            );
                        })(),
                    ]);
                    return {};
                } else {
                    const crdt = Crdt.load(diff);
                    const message = crdt.snapshot();

                    const meId = st.ps.ensureAuthenticated();
                    await st.ps.ensureBoardMember(message.boardId, 'writer');
                    await st.ps.ensureColumnMember(message.columnId, 'writer');
                    await st.ps.ensureCardMember(message.cardId, 'writer');

                    const card = await st.tx.cards.getById(message.cardId);
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
                        message.columnId
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

                    if (message.payload.type === 'card_column_changed') {
                        const fromColumn = await st.tx.columns.getById(
                            message.payload.fromColumnId
                        );
                        if (!fromColumn) {
                            throw new BusinessError(
                                `column not found: ${message.payload.fromColumnId}`,
                                'column_not_found'
                            );
                        }
                        if (fromColumn.boardId !== message.boardId) {
                            throw new BusinessError(
                                `column ${message.payload.fromColumnId} doesn't belong to board ${message.boardId}`,
                                'forbidden'
                            );
                        }

                        const toColumn = await st.tx.columns.getById(
                            message.payload.toColumnId
                        );
                        if (!toColumn) {
                            throw new BusinessError(
                                `column not found: ${message.payload.toColumnId}`,
                                'column_not_found'
                            );
                        }
                        if (toColumn.boardId !== message.boardId) {
                            throw new BusinessError(
                                `column ${message.payload.toColumnId} doesn't belong to board ${message.boardId}`,
                                'forbidden'
                            );
                        }
                    }

                    if (message.payload.type === 'card_assignee_changed') {
                        if (message.payload.toAssigneeId) {
                            const toAssignee =
                                await st.tx.members.getByUserIdAndBoardId(
                                    message.payload.toAssigneeId,
                                    message.boardId,
                                    {excludeDeleted: false}
                                );

                            if (!toAssignee) {
                                throw new BusinessError(
                                    `user ${message.payload.toAssigneeId} is not a member of board ${message.boardId}`,
                                    'forbidden'
                                );
                            }
                        }
                        if (message.payload.fromAssigneeId) {
                            const fromAssignee =
                                await st.tx.members.getByUserIdAndBoardId(
                                    message.payload.fromAssigneeId,
                                    message.boardId,
                                    {excludeDeleted: false}
                                );
                            if (!fromAssignee) {
                                throw new BusinessError(
                                    `user ${message.payload.fromAssigneeId} is not a member of board ${message.boardId}`,
                                    'forbidden'
                                );
                            }
                        }
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
                            payload: expectUnion({
                                text: {
                                    type: 'text',
                                    text: createRichtext(),
                                },
                                card_created: {
                                    type: 'card_created',
                                    cardId: message.cardId,
                                    cardCreatedAt: expectTimestamp(),
                                },
                                card_deleted: {
                                    type: 'card_deleted',
                                    cardId: message.cardId,
                                    cardDeletedAt: expectTimestamp(),
                                },
                                card_column_changed: {
                                    type: 'card_column_changed',
                                    cardId: message.cardId,
                                    fromColumnId: expectString<ColumnId>(),
                                    toColumnId: expectString<ColumnId>(),
                                    fromColumnName: expectString(),
                                    toColumnName: expectString(),
                                    cardColumnChangedAt: expectTimestamp(),
                                },
                                card_assignee_changed: {
                                    type: 'card_assignee_changed',
                                    cardId: message.cardId,
                                    fromAssigneeId:
                                        expectOptional(expectString<UserId>()),
                                    toAssigneeId:
                                        expectOptional(expectString<UserId>()),
                                    cardAssigneeChangedAt: expectTimestamp(),
                                },
                            }),
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
                const existingCard = await st.tx.cards.getById(cardId);
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
                    const column = await st.tx.columns.getById(card.columnId);
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
                                {excludeDeleted: true}
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
                const card = await st.tx.cards.getById(cardId);
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
        createMember: handler({
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                email: Type.String(),
                role: MemberRole(),
                uiUrl: Type.String(),
            }),
            res: Type.Object({}),
            handle: async (st, {boardId, email, role, uiUrl}) => {
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

                await st.memberService.joinBoard({
                    account,
                    boardId,
                    role,
                    uiUrl,
                });

                return {};
            },
        }),
        check: handler({
            req: Type.Object({}),
            res: Type.Object({}),
            handle: async st => {
                await st.tx.boards.update(
                    '0195d761-dfba-76bd-8890-cc942c8be111' as BoardId,
                    x => {
                        x.key = 'sdfiweew';
                    }
                );
                return {};
            },
        }),
        joinByCode: handler({
            req: Type.Object({
                code: Type.String(),
                uiUrl: Type.String(),
            }),
            res: Type.Object({boardKey: Type.String()}),
            handle: async (st, {code, uiUrl}) => {
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
                    uiUrl,
                });

                return {boardKey: board.key};
            },
        }),
        updateMemberRole: handler({
            req: Type.Object({
                memberId: Uuid<MemberId>(),
                role: MemberRole(),
            }),
            res: Type.Object({}),
            handle: async (st, {memberId, role}) => {
                const member = await st.tx.members.getById(memberId, {
                    excludeDeleted: true,
                });

                if (!member) {
                    throw new BusinessError(
                        `member ${memberId} not found`,
                        'member_not_found'
                    );
                }

                if (member.role === role) {
                    return {};
                }

                await whenAll([
                    st.ps.ensureCanManage(member.boardId, member.role),
                    st.ps.ensureCanManage(member.boardId, role),
                ]);

                if (member.role === 'owner') {
                    const allMembers = await st.tx.members
                        .getByBoardId(member.boardId, {excludeDeleted: true})
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
                    {excludeDeleted: true},
                    x => {
                        x.role = role;
                    }
                );

                return {};
            },
        }),
        deleteMember: handler({
            req: Type.Object({memberId: Uuid<MemberId>()}),
            res: Type.Object({}),
            handle: async (st, {memberId}) => {
                const member = await st.tx.members.getById(memberId, {
                    excludeDeleted: true,
                });

                if (!member) {
                    throw new BusinessError(
                        `member ${memberId} not found`,
                        'member_not_found'
                    );
                }

                if (member.userId !== st.ps.ensureAuthenticated()) {
                    await st.ps.ensureCanManage(member.boardId, member.role);
                }

                await st.tx.members.update(
                    memberId,
                    {excludeDeleted: true},
                    x => {
                        x.deletedAt = getNow();
                    }
                );

                return {};
            },
        }),
        deleteColumn: handler({
            req: Type.Object({columnId: Uuid<ColumnId>()}),
            res: Type.Object({}),
            handle: async (st, {columnId}) => {
                await st.ps.ensureColumnMember(columnId, 'writer');
                await st.tx.columns.update(columnId, x => {
                    x.deletedAt = getNow();
                });

                return {};
            },
        }),
        deleteCard: handler({
            req: Type.Object({cardId: Uuid<CardId>()}),
            res: Type.Object({}),
            handle: async (st, {cardId}) => {
                await st.ps.ensureCardMember(cardId, 'writer');
                await st.tx.cards.update(cardId, x => {
                    x.deletedAt = getNow();
                });

                return {};
            },
        }),
        createBoard: handler({
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                name: Type.String(),
                members: Type.Array(Type.String()),
                uiUrl: Type.String(),
            }),
            res: Board(),
            handle: async (st, req) => {
                return await st.tx.boardService.createBoard({
                    authorId: st.ps.ensureAuthenticated(),
                    name: req.name,
                    members: req.members,
                    boardId: req.boardId,
                    template: NEW_BOARD_TEMPLATE,
                    invite: {uiUrl: req.uiUrl},
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
                    st.tx.boards.apply(
                        boardId,
                        diff,
                        writable<Board>({
                            name: true,
                            deletedAt: true,
                            updatedAt: true,
                            pk: false,
                            createdAt: false,
                            id: false,
                            key: false,
                            authorId: false,
                            joinCode: true,
                            joinRole: true,
                        })
                    ),
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
                const existingColumn = await st.tx.columns.getById(columnId);
                if (existingColumn) {
                    await whenAll([
                        st.ps.ensureBoardMember(
                            existingColumn.boardId,
                            'admin'
                        ),
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
                                updatedAt: true,
                            })
                        ),
                    ]);
                } else {
                    const crdt = Crdt.load(diff);
                    const column = crdt.snapshot();

                    const meId = st.ps.ensureAuthenticated();
                    await st.ps.ensureBoardMember(column.boardId, 'admin');

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
                await st.tx.messages.update(messageId, x => {
                    x.deletedAt = getNow();
                });

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
                    st.tx.users.apply(
                        userId,
                        diff,
                        writable<User>({
                            fullName: true,
                            updatedAt: true,
                            avatarKey: true,
                            deletedAt: false,
                            pk: false,
                            createdAt: false,
                            id: false,
                            isDemo: false,
                        })
                    ),
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
        createDemoBoard: handler({
            req: Type.Object({}),
            res: Type.Object({
                boardId: Uuid<BoardId>(),
                jwt: Type.String(),
            }),
            handle: async st => {
                const account = await getAccount({
                    email: `demo.${Math.random().toString(36).slice(2)}@syncwave.dev`,
                    accounts: st.tx.accounts,
                    users: st.tx.users,
                    crypto: st.crypto,
                    boardService: st.tx.boardService,
                    fullName: 'Demo User',
                    skipBoardCreation: true,
                    isDemo: true,
                });

                const board = await st.tx.boardService.createBoard({
                    authorId: account.userId,
                    members: [],
                    name: 'Demo Board',
                    template: BOARD_DEMO_TEMPLATE,
                    invite: false,
                });

                const jwt = await st.jwtService.sign({
                    exp: st.tx.timestamp + ONE_YEAR_MS * 100,
                    iat: st.tx.timestamp,
                    sub: account.id,
                    uid: account.userId,
                });

                return {
                    boardId: board.id,
                    jwt,
                };
            },
        }),
    });
}

export type WriteApiRpc = InferRpcClient<ReturnType<typeof createWriteApi>>;
