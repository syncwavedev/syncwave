import {Type} from '@sinclair/typebox';
import {BusinessError} from '../errors.js';
import {log} from '../logger.js';
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
    type ChangeEvent,
    profileEvents,
    type Transact,
    userEvents,
    zChangeEvent,
} from './data-layer.js';
import {
    toCardViewDto,
    toMemberAdminDto,
    toMemberDto,
    toMessageDto,
    toUserDto,
    zBoardDto,
    zBoardViewDataDto,
    zCardViewDto,
    zMeDto,
    zMemberAdminDto,
    zMemberDto,
    zMessageDto,
    zUserDataDto,
} from './dto.js';
import {EventStoreReader} from './event-store.js';
import {type ObjectStore, zObjectEnvelope} from './infrastructure.js';
import type {AttachmentId} from './repos/attachment-repo.js';
import {type BoardId} from './repos/board-repo.js';
import {type CardId} from './repos/card-repo.js';
import {type UserId} from './repos/user-repo.js';

export class ReadApiState {
    constructor(
        public readonly transact: Transact,
        readonly esReader: EventStoreReader<ChangeEvent>,
        public readonly objectStore: ObjectStore
    ) {}

    ensureAuthenticated(auth: Principal): UserId {
        if (auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return auth.userId;
    }
}

export function createReadApi() {
    return createApi<ReadApiState>()({
        getMe: streamer({
            req: Type.Object({}),
            item: zMeDto(),
            async *stream(st, _, ctx) {
                const userId = st.ensureAuthenticated(ctx.principal);

                yield* observable({
                    async get() {
                        return await st.transact(async tx => {
                            const user = await toUserDto(tx, userId);
                            assert(user !== undefined, 'getMe: user not found');
                            const identity =
                                await tx.identities.getByUserId(userId);
                            assert(
                                identity !== undefined,
                                'getMe: identity not found'
                            );
                            return {user, identity};
                        });
                    },
                    update$: st.esReader
                        .subscribe(userEvents(userId))
                        .then(x => x.map(() => undefined)),
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
                    data: zUserDataDto(),
                }),
                Type.Object({
                    type: Type.Literal('event'),
                    event: zChangeEvent(),
                }),
            ]),
            async *stream(st, {userId}) {
                const events = await st.esReader.subscribe(
                    profileEvents(userId)
                );

                const [user] = await st.transact(async tx => {
                    return await whenAll([tx.users.getById(userId, true)]);
                });

                if (!user) {
                    throw new BusinessError(
                        `user with id ${userId} not found`,
                        'user_not_found'
                    );
                }

                yield {
                    type: 'snapshot' as const,
                    data: {
                        user,
                    },
                };

                for await (const event of events) {
                    yield {
                        type: 'event' as const,
                        event,
                    };
                }
            },
        }),
        getMyMembers: streamer({
            req: Type.Object({}),
            item: Type.Array(zMemberDto()),
            async *stream(st, {}, ctx) {
                const userId = st.ensureAuthenticated(ctx.principal);

                yield* observable({
                    async get() {
                        return st.transact(async tx => {
                            const members = tx.members.getByUserId(
                                userId,
                                false
                            );
                            return await toStream(members)
                                .mapParallel(member =>
                                    toMemberDto(tx, member.id)
                                )
                                .filter(x => !x.deleted && !x.board.deleted)
                                .toArray();
                        });
                    },
                    update$: st.esReader
                        .subscribe(userEvents(userId))
                        .then(x => x.map(() => undefined))
                        .then(x =>
                            x.finally(() => {
                                log.debug('getMyBoards finish updates');
                            })
                        ),
                });
            },
        }),
        getCardView: streamer({
            req: Type.Object({cardId: Uuid<CardId>()}),
            item: zCardViewDto(),
            async *stream(st, {cardId}) {
                const card = await st.transact(tx =>
                    tx.cards.getById(cardId, false)
                );
                if (!card) {
                    throw new BusinessError(
                        `card with id ${cardId} not found`,
                        'card_not_found'
                    );
                }
                yield* observable({
                    async get() {
                        return await st.transact(async tx => {
                            const [nextCard] = await whenAll([
                                toCardViewDto(tx, cardId),
                                tx.ps.ensureCardMember(cardId, 'reader'),
                            ]);
                            return nextCard;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(card.boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getCardViewByKey: streamer({
            req: Type.Object({
                boardKey: Type.String(),
                counter: Type.Number(),
            }),
            item: zCardViewDto(),
            async *stream(st, {boardKey, counter}) {
                const board = await st.transact(tx =>
                    tx.boards.getByKey(boardKey)
                );
                if (board === undefined) {
                    throw new BusinessError(
                        `board with key ${boardKey} not found`,
                        'board_not_found'
                    );
                }
                const card = await st.transact(tx =>
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
                        return await st.transact(async tx => {
                            const [nextCard] = await whenAll([
                                toCardViewDto(tx, card.id),
                                tx.ps.ensureBoardMember(card.boardId, 'reader'),
                            ]);
                            return nextCard;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getAttachmentObject: handler({
            req: Type.Object({
                attachmentId: Uuid<AttachmentId>(),
            }),
            res: zObjectEnvelope(),
            async handle(st, {attachmentId}) {
                return await st.transact(async tx => {
                    await tx.ps.ensureAttachmentMember(attachmentId, 'reader');
                    const attachment = await tx.attachments.getById(
                        attachmentId,
                        true
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
        getCardMessages: streamer({
            req: Type.Object({cardId: Uuid<CardId>()}),
            item: Type.Array(zMessageDto()),
            async *stream(st, {cardId}) {
                const card = await st.transact(tx =>
                    tx.ps.ensureCardMember(cardId, 'reader')
                );
                yield* observable({
                    get() {
                        return st.transact(async tx => {
                            await tx.ps.ensureCardMember(cardId, 'reader');
                            return tx.messages
                                .getByCardId(cardId)
                                .mapParallel(x => toMessageDto(tx, x.id))
                                .toArray();
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(card.boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getBoardMembers: streamer({
            req: Type.Object({boardId: Uuid<BoardId>()}),
            item: Type.Array(zMemberAdminDto()),
            async *stream(st, {boardId}) {
                yield* observable({
                    get() {
                        return st.transact(async tx => {
                            await tx.ps.ensureBoardMember(boardId, 'admin');
                            return tx.members
                                .getByBoardId(boardId)
                                .mapParallel(x => toMemberAdminDto(tx, x.id))
                                .toArray();
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getBoard: streamer({
            req: Type.Object({
                key: Type.String(),
            }),
            item: zBoardDto(),
            async *stream(st, {key}) {
                const board = await st.transact(tx => tx.boards.getByKey(key));
                if (board === undefined) {
                    throw new BusinessError(
                        `board with key ${key} not found`,
                        'board_not_found'
                    );
                }
                const boardId = board.id;
                yield* observable({
                    async get() {
                        return await st.transact(async tx => {
                            const [board] = await whenAll([
                                tx.boards.getById(boardId, true),
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
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getBoardViewData: streamer({
            req: Type.Object({
                key: Type.String(),
            }),
            item: Type.Union([
                Type.Object({
                    type: Type.Literal('snapshot'),
                    data: zBoardViewDataDto(),
                }),
                Type.Object({
                    type: Type.Literal('event'),
                    event: zChangeEvent(),
                }),
            ]),
            async *stream(st, {key}) {
                const boardByKey = await st.transact(tx =>
                    tx.boards.getByKey(key.toUpperCase())
                );
                if (!boardByKey) {
                    throw new BusinessError(
                        `board with key ${key} not found`,
                        'board_not_found'
                    );
                }

                const boardId = boardByKey.id;
                const events = await st.esReader.subscribe(
                    boardEvents(boardId)
                );

                const [board, columns, cards, users] = await st.transact(
                    async tx => {
                        return await whenAll([
                            tx.boards.getById(boardId),
                            toStream(
                                tx.columns.getByBoardId(boardId, true)
                            ).toArray(),
                            toStream(
                                tx.cards.getByBoardId(boardId, true)
                            ).toArray(),
                            toStream(tx.members.getByBoardId(boardId, true))
                                .mapParallel(x =>
                                    tx.users.getById(x.userId, true)
                                )
                                .assert(x => x !== undefined, 'user not found')
                                .toArray(),
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

                yield {
                    type: 'snapshot' as const,
                    data: {
                        board: board,
                        columns: columns,
                        cards: cards,
                        users: users,
                    },
                };

                for await (const event of events) {
                    yield {
                        type: 'event' as const,
                        event,
                    };
                }
            },
        }),
    });
}

export type ReadApiRpc = InferRpcClient<ReturnType<typeof createReadApi>>;
