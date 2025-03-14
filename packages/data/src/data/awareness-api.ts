import {Type} from '@sinclair/typebox';
import type {AwarenessState} from '../awareness.js';
import {PULL_INTERVAL_MS} from '../constants.js';
import {context} from '../context.js';
import {BusinessError, toError} from '../errors.js';
import {log} from '../logger.js';
import {Stream, toStream} from '../stream.js';
import type {Hub} from '../transport/hub.js';
import {
    createApi,
    handler,
    streamer,
    type InferRpcClient,
} from '../transport/rpc.js';
import {assert, equals, interval, whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import type {AuthContext} from './auth-context.js';
import {
    AwarenessConflictError,
    AwarenessOwnershipError,
} from './awareness-store.js';
import {boardEvents, type ChangeEvent, type Transact} from './data-layer.js';
import type {EventStoreReader} from './event-store.js';
import type {BoardId} from './repos/board-repo.js';
import {type UserId} from './repos/user-repo.js';

function boardAwarenessRoom(boardId: BoardId) {
    return 'awareness/board/' + boardId;
}

export class AwarenessApiState {
    constructor(
        public readonly transact: Transact,
        public readonly hub: Hub,
        public readonly auth: AuthContext,
        public readonly esReader: EventStoreReader<ChangeEvent>
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

    async createState(
        boardId: BoardId,
        clientId: number,
        state: AwarenessState
    ) {
        await this.transact(async tx => {
            try {
                await tx.awareness.create(
                    boardAwarenessRoom(boardId),
                    this.ensureAuthenticated(),
                    clientId,
                    state
                );
            } catch (error) {
                if (error instanceof AwarenessConflictError) {
                    throw new BusinessError(
                        `awareness client ${clientId} already exists`,
                        'forbidden'
                    );
                }

                throw error;
            }

            tx.scheduleEffect(async () => {
                await this.hub.emit(boardAwarenessRoom(boardId));
            });
        });
    }

    async updateState(
        boardId: BoardId,
        clientId: number,
        state: AwarenessState
    ) {
        await this.transact(async tx => {
            try {
                await tx.awareness.put(
                    boardAwarenessRoom(boardId),
                    this.ensureAuthenticated(),
                    clientId,
                    state
                );
            } catch (error) {
                if (error instanceof AwarenessOwnershipError) {
                    throw new BusinessError(
                        `awareness client ${clientId} is owned by another user ${error.ownerId}, user ${this.auth.userId} is not allowed to update it`,
                        'forbidden'
                    );
                }

                throw error;
            }

            tx.scheduleEffect(async () => {
                await this.hub.emit(boardAwarenessRoom(boardId));
            });
        });
    }

    async offline(boardId: BoardId, clientId: number) {
        await this.transact(async tx => {
            await tx.awareness.offline(boardAwarenessRoom(boardId), clientId);
            tx.scheduleEffect(async () => {
                await this.hub.emit(boardAwarenessRoom(boardId));
            });
        });
    }
}

export function zAwarenessState() {
    return Type.Union([
        Type.Record(Type.String(), Type.Unknown()),
        Type.Null(),
    ]);
}

export function createAwarenessApi() {
    return createApi<AwarenessApiState>()({
        joinBoardAwareness: streamer({
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                clientId: Type.Number(),
                state: zAwarenessState(),
            }),
            item: Type.Object({
                states: Type.Array(
                    Type.Object({
                        clientId: Type.Number(),
                        state: zAwarenessState(),
                    })
                ),
            }),
            async *stream(st, {boardId, clientId, state}) {
                const board = await st.transact(tx =>
                    tx.boards.getById(boardId)
                );
                if (board === undefined) {
                    throw new BusinessError(
                        `board with id ${boardId} not found`,
                        'board_not_found'
                    );
                }

                await st.createState(board.id, clientId, state);

                const updates = Stream.merge([
                    await st.esReader.subscribe(boardEvents(board.id)),
                    (await st.hub.subscribe(boardAwarenessRoom(board.id))).map(
                        () => undefined
                    ),
                    toStream([undefined]), // initial trigger to start immediately
                    interval({ms: PULL_INTERVAL_MS, onCancel: 'reject'}).map(
                        () => undefined
                    ),
                ]).conflateLatest();

                try {
                    let prevItem: unknown = undefined;
                    for await (const _ of updates) {
                        const nextItem = await st.transact(async tx => {
                            const [states] = await whenAll([
                                tx.awareness.getAll(
                                    boardAwarenessRoom(board.id)
                                ),
                                tx.ps.ensureBoardMember(board.id, 'reader'),
                            ]);

                            return {
                                states: await whenAll(
                                    states.map(
                                        async ({clientId, userId, state}) => ({
                                            clientId,
                                            state: {
                                                ...state,
                                                user: {
                                                    ...(state?.user ?? {}),
                                                    name: await tx.users
                                                        .getById(userId, true)
                                                        .then(user => {
                                                            assert(
                                                                user !==
                                                                    undefined,
                                                                `user with id ${userId} not found`
                                                            );
                                                            return user.fullName;
                                                        }),
                                                },
                                            },
                                        })
                                    )
                                ),
                            };
                        });

                        if (!equals(prevItem, nextItem)) {
                            yield nextItem;
                        }

                        prevItem = nextItem;
                    }
                } finally {
                    context().detach({span: 'awareness stream closed'}, () => {
                        st.offline(boardId, clientId).catch(error => {
                            log.error(
                                toError(error),
                                'failed to remove awareness state'
                            );
                        });
                    });
                }
            },
        }),
        updateBoardAwarenessState: handler({
            req: Type.Object({
                boardId: Uuid<BoardId>(),
                clientId: Type.Number(),
                state: zAwarenessState(),
            }),
            res: Type.Object({}),
            async handle(st, {boardId, clientId, state}) {
                const board = await st.transact(async tx => {
                    const [result] = await whenAll([
                        tx.boards.getById(boardId),
                        tx.ps.ensureBoardMember(boardId, 'reader'),
                    ]);
                    return result;
                });
                if (board === undefined) {
                    throw new BusinessError(
                        `board with id ${boardId} not found`,
                        'board_not_found'
                    );
                }

                await st.updateState(board.id, clientId, state);

                return {};
            },
        }),
    });
}

export type AwarenessApiRpc = InferRpcClient<
    ReturnType<typeof createAwarenessApi>
>;
