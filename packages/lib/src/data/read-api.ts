import {Type} from '@sinclair/typebox';
import {BusinessError} from '../errors.js';
import {observable, toStream} from '../stream.js';
import {
    createApi,
    handler,
    type InferRpcClient,
    streamer,
} from '../transport/rpc.js';
import {assert, whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import type {Principal} from './auth.js';
import {
    boardEvents,
    ChangeEvent,
    DataLayer,
    type DataTx,
    profileEvents,
    userEvents,
} from './data-layer.js';
import {
    BoardDto,
    BoardViewDataDto,
    CardTreeViewDataDto,
    CardViewDto,
    MeDto,
    MemberAdminDto,
    MemberDto,
    MeViewDataDto,
    toCardViewDto,
    toMemberAdminDto,
    toMemberDto,
    toUserDto,
    UserDataDto,
} from './dto.js';
import {EventStoreReader} from './event-store.js';
import {ObjectEnvelope, type ObjectStore} from './infrastructure.js';
import type {AttachmentId} from './repos/attachment-repo.js';
import {type BoardId} from './repos/board-repo.js';
import {type CardId} from './repos/card-repo.js';
import {type UserId} from './repos/user-repo.js';

export class ReadApiState {
    readonly esReader: EventStoreReader<ChangeEvent>;

    constructor(
        public readonly dataLayer: DataLayer,
        public readonly objectStore: ObjectStore
    ) {
        this.esReader = dataLayer.esReader;
    }

    ensureAuthenticated(auth: Principal): UserId {
        if (auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return auth.userId;
    }

    async transact<T>(
        principal: Principal,
        fn: (tx: DataTx) => Promise<T>
    ): Promise<T> {
        return this.dataLayer.transact(principal, fn);
    }
}

export function createReadApi() {
    return createApi<ReadApiState>()({
        getMe: streamer({
            req: Type.Object({}),
            item: MeDto(),
            async *stream(state, {}, {principal}) {
                const userId = state.ensureAuthenticated(principal);

                yield* observable({
                    async get() {
                        return await state.transact(principal, async tx => {
                            const user = await toUserDto(tx, userId);
                            assert(user !== undefined, 'getMe: user not found');
                            const account =
                                await tx.accounts.getByUserId(userId);
                            assert(
                                account !== undefined,
                                'getMe: account not found'
                            );
                            return {user, account};
                        });
                    },
                    update$: state.esReader
                        .subscribe(userEvents(userId))
                        .then(x => x.events.map(() => undefined)),
                });
            },
        }),
        getProfileData: streamer({
            req: Type.Object({
                userId: Uuid<UserId>(),
            }),
            item: Type.Union([
                Type.Object({
                    type: Type.Literal('snapshot'),
                    data: UserDataDto(),
                }),
                Type.Object({
                    type: Type.Literal('event'),
                    event: ChangeEvent(),
                }),
            ]),
            async *stream(st, {userId}, {principal}) {
                const {offset, events} = await st.esReader.subscribe(
                    profileEvents(userId)
                );

                const [user] = await st.transact(principal, async tx => {
                    return await whenAll([
                        tx.users.getById(userId, {includeDeleted: true}),
                    ]);
                });

                if (!user) {
                    throw new BusinessError(
                        `user with id ${userId} not found`,
                        'user_not_found'
                    );
                }

                yield {
                    type: 'snapshot' as const,
                    offset,
                    data: {
                        user,
                    },
                };

                for await (const {event} of events) {
                    yield {
                        type: 'event' as const,
                        event,
                    };
                }
            },
        }),
        getMyMembers: streamer({
            req: Type.Object({}),
            item: Type.Array(MemberDto()),
            async *stream(st, {}, {principal}) {
                const userId = st.ensureAuthenticated(principal);

                yield* observable({
                    async get() {
                        return st.transact(principal, async tx => {
                            const members = tx.members.getByUserId(userId, {
                                includeDeleted: false,
                            });
                            return await toStream(members)
                                .mapParallel(member =>
                                    toMemberDto(tx, member.id)
                                )
                                .filter(x => !x.deletedAt && !x.board.deletedAt)
                                .toArray();
                        });
                    },
                    update$: st.esReader
                        .subscribe(userEvents(userId))
                        .then(x => x.events.map(() => undefined)),
                });
            },
        }),
        getCardView: streamer({
            req: Type.Object({cardId: Uuid<CardId>()}),
            item: CardViewDto(),
            async *stream(st, {cardId}, {principal}) {
                const card = await st.transact(principal, tx =>
                    tx.cards.getById(cardId, {includeDeleted: false})
                );
                if (!card) {
                    throw new BusinessError(
                        `card with id ${cardId} not found`,
                        'card_not_found'
                    );
                }
                yield* observable({
                    async get() {
                        return await st.transact(principal, async tx => {
                            const [nextCard] = await whenAll([
                                toCardViewDto(tx, cardId),
                                tx.ps.ensureCardMember(cardId, 'reader'),
                            ]);
                            return nextCard;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(card.boardId))
                        .then(x => x.events.map(() => undefined)),
                });
            },
        }),
        getCardViewByKey: streamer({
            req: Type.Object({
                boardKey: Type.String(),
                counter: Type.Number(),
            }),
            item: CardViewDto(),
            async *stream(st, {boardKey, counter}, {principal}) {
                const board = await st.transact(principal, tx =>
                    tx.boards.getByKey(boardKey)
                );
                if (board === undefined) {
                    throw new BusinessError(
                        `board with key ${boardKey} not found`,
                        'board_not_found'
                    );
                }
                const card = await st.transact(principal, tx =>
                    tx.cards.getByBoardIdAndCounter(board.id, counter)
                );
                if (card === undefined) {
                    throw new BusinessError(
                        `card with counter ${counter} not found`,
                        'card_not_found'
                    );
                }
                const boardId = board.id;
                yield* observable({
                    async get() {
                        return await st.transact(principal, async tx => {
                            const [nextCard] = await whenAll([
                                toCardViewDto(tx, card.id),
                                tx.ps.ensureBoardMember(card.boardId, 'reader'),
                            ]);
                            return nextCard;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(boardId))
                        .then(x => x.events.map(() => undefined)),
                });
            },
        }),
        getAttachmentObject: handler({
            req: Type.Object({
                attachmentId: Uuid<AttachmentId>(),
            }),
            res: ObjectEnvelope(),
            async handle(st, {attachmentId}, {principal}) {
                return await st.transact(principal, async tx => {
                    await tx.ps.ensureAttachmentMember(attachmentId, 'reader');
                    const attachment = await tx.attachments.getById(
                        attachmentId,
                        {includeDeleted: true}
                    );
                    if (attachment === undefined) {
                        throw new BusinessError(
                            `attachment with id ${attachmentId} not found`,
                            'attachment_not_found'
                        );
                    }

                    const envelope = await st.objectStore.get(
                        attachment.objectKey
                    );
                    assert(
                        envelope !== undefined,
                        'getAttachmentObject: object not found'
                    );

                    return envelope;
                });
            },
        }),
        getCardViewData: streamer({
            req: Type.Object({
                cardId: Uuid<CardId>(),
                startOffset: Type.Optional(Type.Number()),
            }),
            item: Type.Union([
                Type.Object({
                    type: Type.Literal('snapshot'),
                    data: CardTreeViewDataDto(),
                    offset: Type.Number(),
                }),
                Type.Object({
                    type: Type.Literal('event'),
                    event: ChangeEvent(),
                    offset: Type.Number(),
                }),
            ]),
            async *stream(st, {cardId, startOffset}, {principal}) {
                const card = await st.transact(principal, tx =>
                    tx.cards.getById(cardId, {includeDeleted: true})
                );
                if (!card) {
                    throw new BusinessError(
                        `card with id ${cardId} not found`,
                        'card_not_found'
                    );
                }

                const {offset, events} = await st.esReader.subscribe(
                    boardEvents(card.boardId),
                    startOffset
                );

                const [messages, attachments, users] = await st.transact(
                    principal,
                    async tx => {
                        return await whenAll([
                            tx.messages.getByCardId(cardId).toArray(),
                            tx.attachments.getByCardId(cardId).toArray(),
                            getBoardUsers(tx, card.boardId),
                            tx.ps.ensureCardMember(cardId, 'reader'),
                        ]);
                    }
                );

                if (startOffset === undefined) {
                    yield {
                        type: 'snapshot' as const,
                        offset,
                        data: {
                            boardId: card.boardId,
                            messages,
                            attachments,
                            users,
                            card,
                        },
                    };
                }

                for await (const {event, offset} of events) {
                    yield {
                        type: 'event' as const,
                        event,
                        offset,
                    };
                }
            },
        }),
        getBoardMembers: streamer({
            req: Type.Object({boardId: Uuid<BoardId>()}),
            item: Type.Array(MemberAdminDto()),
            async *stream(st, {boardId}, {principal}) {
                yield* observable({
                    get() {
                        return st.transact(principal, async tx => {
                            await tx.ps.ensureBoardMember(boardId, 'admin');
                            return tx.members
                                .getByBoardId(boardId)
                                .mapParallel(x => toMemberAdminDto(tx, x.id))
                                .toArray();
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(boardId))
                        .then(x => x.events.map(() => undefined)),
                });
            },
        }),
        getBoard: streamer({
            req: Type.Object({
                key: Type.String(),
            }),
            item: BoardDto(),
            async *stream(st, {key}, {principal}) {
                const board = await st.transact(principal, tx =>
                    tx.boards.getByKey(key)
                );
                if (board === undefined) {
                    throw new BusinessError(
                        `board with key ${key} not found`,
                        'board_not_found'
                    );
                }
                const boardId = board.id;
                yield* observable({
                    async get() {
                        return await st.transact(principal, async tx => {
                            const [board] = await whenAll([
                                tx.boards.getById(boardId, {
                                    includeDeleted: true,
                                }),
                                tx.ps.ensureBoardMember(boardId, 'reader'),
                            ]);
                            if (board === undefined) {
                                throw new BusinessError(
                                    `board with key ${key} not found`,
                                    'board_not_found'
                                );
                            }

                            return board;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(boardId))
                        .then(x => x.events.map(() => undefined)),
                });
            },
        }),
        getBoardViewData: streamer({
            req: Type.Object({
                key: Type.String(),
                startOffset: Type.Optional(Type.Number()),
            }),
            item: Type.Union([
                Type.Object({
                    type: Type.Literal('snapshot'),
                    data: BoardViewDataDto(),
                    offset: Type.Number(),
                }),
                Type.Object({
                    type: Type.Literal('event'),
                    event: ChangeEvent(),
                    offset: Type.Number(),
                }),
            ]),
            async *stream(st, {key, startOffset}, {principal}) {
                const boardByKey = await st.transact(principal, tx =>
                    tx.boards.getByKey(key.toUpperCase())
                );
                if (!boardByKey) {
                    throw new BusinessError(
                        `board with key ${key} not found`,
                        'board_not_found'
                    );
                }

                const boardId = boardByKey.id;
                const {offset, events} = await st.esReader.subscribe(
                    boardEvents(boardId),
                    startOffset
                );

                const [board, columns, cards, users] = await st.transact(
                    principal,
                    async tx => {
                        return await whenAll([
                            tx.boards.getById(boardId),
                            toStream(
                                tx.columns.getByBoardId(boardId, {
                                    includeDeleted: true,
                                })
                            ).toArray(),
                            toStream(
                                tx.cards.getByBoardId(boardId, {
                                    includeDeleted: true,
                                })
                            ).toArray(),
                            getBoardUsers(tx, boardId),
                            tx.ps.ensureBoardMember(boardId, 'reader'),
                        ]);
                    }
                );

                if (!board) {
                    throw new BusinessError(
                        `board with key ${key} not found`,
                        'board_not_found'
                    );
                }

                if (startOffset === undefined) {
                    yield {
                        type: 'snapshot' as const,
                        offset,
                        data: {
                            board: board,
                            columns: columns,
                            cards: cards,
                            users: users,
                        },
                    };
                }

                for await (const {event, offset} of events) {
                    yield {
                        type: 'event' as const,
                        event,
                        offset,
                    };
                }
            },
        }),
        getMeViewData: streamer({
            req: Type.Object({
                startOffset: Type.Optional(Type.Number()),
            }),
            item: Type.Union([
                Type.Object({
                    type: Type.Literal('snapshot'),
                    data: MeViewDataDto(),
                    offset: Type.Number(),
                }),
                Type.Object({
                    type: Type.Literal('event'),
                    event: ChangeEvent(),
                    offset: Type.Number(),
                }),
            ]),
            async *stream(st, {startOffset}, {principal}) {
                const profileId = st.ensureAuthenticated(principal);

                const {offset, events} = await st.esReader.subscribe(
                    userEvents(profileId),
                    startOffset
                );

                const [profile, account, [members, boards]] = await st.transact(
                    principal,
                    async tx => {
                        return await whenAll([
                            tx.users
                                .getById(profileId, {includeDeleted: true})
                                .then(user => {
                                    assert(
                                        user !== undefined,
                                        `user with id ${profileId} not found`
                                    );
                                    return user;
                                }),
                            tx.accounts.getByUserId(profileId).then(account => {
                                assert(
                                    account !== undefined,
                                    `account for user ${profileId} not found`
                                );
                                return account;
                            }),
                            (async () => {
                                const pairs = await tx.members
                                    .getByUserId(profileId, {
                                        includeDeleted: false,
                                    })
                                    .mapParallel(async member => {
                                        const board = await tx.boards.getById(
                                            member.boardId,
                                            {
                                                includeDeleted: true,
                                            }
                                        );
                                        assert(
                                            board !== undefined,
                                            'board not found'
                                        );
                                        return [member, board] as const;
                                    })
                                    .toArray();

                                const members = pairs.map(([member]) => member);
                                const boards = pairs.map(([, board]) => board);

                                return [members, boards] as const;
                            })(),
                        ]);
                    }
                );

                if (startOffset === undefined) {
                    yield {
                        type: 'snapshot' as const,
                        offset,
                        data: {
                            boards,
                            profile,
                            account,
                            members,
                        },
                    };
                }

                for await (const {event, offset} of events) {
                    yield {
                        type: 'event' as const,
                        event,
                        offset,
                    };
                }
            },
        }),
    });
}

export type ReadApiRpc = InferRpcClient<ReturnType<typeof createReadApi>>;

function getBoardUsers(tx: DataTx, boardId: BoardId) {
    return toStream(
        tx.members.getByBoardId(boardId, {
            includeDeleted: true,
        })
    )
        .mapParallel(x =>
            tx.users.getById(x.userId, {
                includeDeleted: true,
            })
        )
        .assert(x => x !== undefined, 'user not found')
        .toArray();
}
