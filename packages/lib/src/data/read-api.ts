import {Type} from '@sinclair/typebox';
import {BusinessError} from '../errors.js';
import {toStream} from '../stream.js';
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
    userEvents,
} from './data-layer.js';
import {BoardViewDataDto, CardTreeViewDataDto, MeViewDataDto} from './dto.js';
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
        echo: handler({
            req: Type.Object({
                time: Type.Number(),
            }),
            res: Type.Object({
                time: Type.Number(),
            }),
            async handle(_st, {time}) {
                return {time};
            },
        }),
        getAttachmentObject: handler({
            req: Type.Object({
                attachmentId: Uuid<AttachmentId>(),
            }),
            res: ObjectEnvelope(),
            async handle(st, {attachmentId}, {principal}) {
                return await st.transact(principal, async tx => {
                    await tx.permissionService.ensureAttachmentMember(
                        attachmentId,
                        'reader'
                    );
                    const attachment =
                        await tx.attachments.getById(attachmentId);
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
                    tx.cards.getById(cardId)
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

                const [messages, attachments, users, userEmails] =
                    await st.transact(principal, async tx => {
                        return await whenAll([
                            tx.messages.getByCardId(cardId).toArray(),
                            tx.attachments.getByCardId(cardId).toArray(),
                            getBoardUsers(tx, card.boardId),
                            getBoardUserEmails(tx, card.boardId),
                            tx.permissionService.ensureCardMember(
                                cardId,
                                'reader'
                            ),
                        ]);
                    });

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
                            userEmails,
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

                const [board, columns, cards, users, userEmails] =
                    await st.transact(principal, async tx => {
                        return await whenAll([
                            tx.boards.getById(boardId),
                            toStream(
                                tx.columns.getByBoardId(boardId)
                            ).toArray(),
                            toStream(tx.cards.getByBoardId(boardId)).toArray(),
                            getBoardUsers(tx, boardId),
                            getBoardUserEmails(tx, boardId),
                            tx.permissionService.ensureBoardMember(
                                boardId,
                                'reader'
                            ),
                        ]);
                    });

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
                            members: userEmails,
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
                            tx.users.getById(profileId).then(user => {
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
                                        excludeDeleted: true,
                                    })
                                    .mapParallel(async member => {
                                        const board = await tx.boards.getById(
                                            member.boardId,
                                            {
                                                excludeDeleted: true,
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
            excludeDeleted: false,
        })
    )
        .mapParallel(x =>
            tx.users.getById(x.userId, {
                excludeDeleted: false,
            })
        )
        .assert(x => x !== undefined, 'user not found')
        .toArray();
}

function getBoardUserEmails(tx: DataTx, boardId: BoardId) {
    return toStream(tx.members.getByBoardId(boardId, {excludeDeleted: false}))
        .mapParallel(async x => {
            const account = await tx.accounts.getByUserId(x.userId);
            assert(
                account !== undefined,
                'getBoardUserEmails: account not found'
            );
            return {
                role: x.role,
                userId: x.userId,
                email: account.email,
            };
        })
        .toArray();
}
