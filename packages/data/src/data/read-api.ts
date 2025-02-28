import {Type} from '@sinclair/typebox';
import {BusinessError} from '../errors.js';
import {log} from '../logger.js';
import {observable, toStream} from '../stream.js';
import {createApi, type InferRpcClient, streamer} from '../transport/rpc.js';
import {assert, whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import type {AuthContext} from './auth-context.js';
import {
    boardEvents,
    type ChangeEvent,
    type Transact,
    userEvents,
} from './data-layer.js';
import {
    toBoardViewDto,
    toCommentDto,
    toMemberAdminDto,
    toMemberDto,
    toUserDto,
    zBoardDto,
    zBoardViewDto,
    zCommentDto,
    zMemberAdminDto,
    zMemberDto,
    zUserDto,
} from './dto.js';
import {EventStoreReader} from './event-store.js';
import {type BoardId} from './repos/board-repo.js';
import {type CardId, zCard} from './repos/card-repo.js';
import {zIdentity} from './repos/identity-repo.js';
import {type UserId} from './repos/user-repo.js';

export class ReadApiState {
    constructor(
        public readonly transact: Transact,
        readonly esReader: EventStoreReader<ChangeEvent>,
        public readonly auth: AuthContext
    ) {}

    ensureAuthenticated(): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }
}

export function createReadApi() {
    return createApi<ReadApiState>()({
        getMe: streamer({
            req: Type.Object({}),
            item: Type.Object({
                user: zUserDto(),
                identity: zIdentity(),
            }),
            async *stream(st, _, ctx) {
                const userId = st.ensureAuthenticated();

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
        getMyMembers: streamer({
            req: Type.Object({}),
            item: Type.Array(zMemberDto()),
            async *stream(st) {
                const userId = st.ensureAuthenticated();

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
                                .filter(x => !x.deleted)
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
        getBoardCards: streamer({
            req: Type.Object({boardId: Uuid<BoardId>()}),
            item: Type.Array(zCard()),
            async *stream(st, {boardId}) {
                yield* observable({
                    async get() {
                        return await st.transact(async tx => {
                            const [cards] = await whenAll([
                                tx.cards.getByBoardId(boardId).toArray(),
                                tx.ps.ensureBoardMember(boardId, 'reader'),
                            ]);

                            return cards;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getCard: streamer({
            req: Type.Object({cardId: Uuid<CardId>()}),
            item: Type.Union([zCard(), Type.Null()]),
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
                            const card = await tx.cards.getById(cardId, true);
                            if (!card) {
                                return null;
                            }
                            await tx.ps.ensureBoardMember(
                                card.boardId,
                                'reader'
                            );

                            return card;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(card.boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getCardComments: streamer({
            req: Type.Object({cardId: Uuid<CardId>()}),
            item: Type.Array(zCommentDto()),
            async *stream(st, {cardId}) {
                const card = await st.transact(tx =>
                    tx.ps.ensureCardMember(cardId, 'reader')
                );
                yield* observable({
                    get() {
                        return st.transact(async tx => {
                            await tx.ps.ensureCardMember(cardId, 'reader');
                            return tx.comments
                                .getByCardId(cardId)
                                .mapParallel(x => toCommentDto(tx, x.id))
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
        getBoardView: streamer({
            req: Type.Object({
                key: Type.String(),
            }),
            item: zBoardViewDto(),
            async *stream(st, {key}) {
                const board = await log.time('getBoardView get board', () =>
                    st.transact(tx => tx.boards.getByKey(key))
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

                            return toBoardViewDto(tx, board.id);
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
    });
}

export type ReadApiRpc = InferRpcClient<ReturnType<typeof createReadApi>>;
