import {Type} from '@sinclair/typebox';
import {zAwarenessState, type AwarenessState} from '../awareness.js';
import {BatchProcessor} from '../batch-processor.js';
import {PULL_INTERVAL_MS} from '../constants.js';
import {context} from '../context.js';
import {BusinessError} from '../errors.js';
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
import type {Principal} from './auth.js';
import {AwarenessOwnershipError} from './awareness-store.js';
import {DataLayer, type ChangeEvent} from './data-layer.js';
import type {EventStoreReader} from './event-store.js';
import type {BoardId} from './repos/board-repo.js';
import {type UserId} from './repos/user-repo.js';

function boardAwarenessRoom(boardId: BoardId) {
    return 'awareness/board/' + boardId;
}

export class AwarenessApiState {
    private batchProcessors = new Map<string, BatchProcessor<AwarenessState>>();
    public readonly esReader: EventStoreReader<ChangeEvent>;

    constructor(
        public readonly dataLayer: DataLayer,
        public readonly hub: Hub
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

    async putState(
        principal: Principal,
        boardId: BoardId,
        clientId: number,
        state: AwarenessState
    ) {
        const batchKey = boardId + clientId;
        let batchProcessor = this.batchProcessors.get(batchKey);
        if (batchProcessor === undefined) {
            batchProcessor = new BatchProcessor({
                state: {type: 'running'},
                enqueueDelay: 0,
                process: async batch => {
                    await this.dataLayer.transact(principal, async tx => {
                        try {
                            const latestState = batch.at(-1);
                            assert(
                                latestState !== undefined,
                                'awareness latest state now found'
                            );
                            await tx.awareness.put(
                                boardAwarenessRoom(boardId),
                                this.ensureAuthenticated(principal),
                                clientId,
                                latestState
                            );
                        } catch (error) {
                            if (error instanceof AwarenessOwnershipError) {
                                throw new BusinessError(
                                    `awareness client ${clientId} is owned by another user ${error.ownerId}, user ${principal.userId} is not allowed to update it`,
                                    'forbidden'
                                );
                            }

                            throw error;
                        }

                        tx.scheduleEffect(async () => {
                            await this.hub.emit(boardAwarenessRoom(boardId));
                        });
                    });
                },
                doneCallback: () => this.batchProcessors.delete(batchKey),
                retries: 0,
            });
            this.batchProcessors.set(batchKey, batchProcessor);
        }

        await batchProcessor.enqueue(state);
    }

    async offline(principal: Principal, boardId: BoardId, clientId: number) {
        await this.dataLayer.transact(principal, async tx => {
            await tx.awareness.offline(boardAwarenessRoom(boardId), clientId);
            tx.scheduleEffect(async () => {
                await this.hub.emit(boardAwarenessRoom(boardId));
            });
        });
    }
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
            async *stream(st, {boardId, clientId, state}, {principal}) {
                const board = await st.dataLayer.transact(principal, tx =>
                    tx.boards.getById(boardId)
                );
                if (board === undefined) {
                    throw new BusinessError(
                        `board with id ${boardId} not found`,
                        'board_not_found'
                    );
                }

                await st.putState(principal, board.id, clientId, state);

                const updates = Stream.merge([
                    (await st.hub.subscribe(boardAwarenessRoom(board.id))).map(
                        () => undefined
                    ),
                    toStream([undefined]), // initial trigger to start immediately
                    interval({ms: PULL_INTERVAL_MS, onCancel: 'reject'}).map(
                        () => undefined
                    ),
                ]).conflate();

                try {
                    let prevItem: unknown = undefined;
                    for await (const _ of updates) {
                        const nextItem = await st.dataLayer.transact(
                            principal,
                            async tx => {
                                const [states] = await whenAll([
                                    tx.awareness.getAll(
                                        boardAwarenessRoom(board.id)
                                    ),
                                    tx.ps.ensureBoardMember(board.id, 'reader'),
                                ]);

                                return {states};
                            }
                        );

                        if (!equals(prevItem, nextItem)) {
                            yield nextItem;
                        }

                        prevItem = nextItem;
                    }
                } finally {
                    context().detach({span: 'awareness stream closed'}, () => {
                        st.offline(principal, boardId, clientId).catch(
                            error => {
                                log.error({
                                    error,
                                    msg: 'failed to remove awareness state',
                                });
                            }
                        );
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
            async handle(st, {boardId, clientId, state}, {principal}) {
                await st.dataLayer.transact(principal, async tx => {
                    const [result] = await whenAll([
                        tx.ps.ensureBoardMember(boardId, 'reader'),
                        st.putState(principal, boardId, clientId, state),
                    ]);
                    return result;
                });

                return {};
            },
        }),
    });
}

export type AwarenessApiRpc = InferRpcClient<
    ReturnType<typeof createAwarenessApi>
>;
