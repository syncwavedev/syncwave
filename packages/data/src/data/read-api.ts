import {z} from 'zod';
import {BusinessError} from '../errors.js';
import {log} from '../logger.js';
import {observable, toStream} from '../stream.js';
import {createApi, type InferRpcClient, streamer} from '../transport/rpc.js';
import {assert, whenAll} from '../utils.js';
import {zUuid} from '../uuid.js';
import type {AuthContext} from './auth-context.js';
import {
    boardEvents,
    type ChangeEvent,
    type Transact,
    userEvents,
} from './data-layer.js';
import {
    toBoardDto,
    toBoardViewDto,
    toCommentDto,
    toMemberAdminDto,
    toUserDto,
    zBoardDto,
    zBoardViewDto,
    zCommentDto,
    zMemberAdminDto,
    zUserDto,
} from './dto.js';
import {EventStoreReader} from './event-store.js';
import {type BoardId} from './repos/board-repo.js';
import {zIdentity} from './repos/identity-repo.js';
import {type TaskId, zTask} from './repos/task-repo.js';
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
            req: z.object({}),
            item: z.object({
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
        getMyBoards: streamer({
            req: z.object({}),
            item: z.array(zBoardDto()),
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
                                    toBoardDto(tx, member.boardId)
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
        getBoardTasks: streamer({
            req: z.object({boardId: zUuid<BoardId>()}),
            item: z.array(zTask()),
            async *stream(st, {boardId}) {
                yield* observable({
                    async get() {
                        return await st.transact(async tx => {
                            const [tasks] = await whenAll([
                                tx.tasks.getByBoardId(boardId).toArray(),
                                tx.ps.ensureBoardMember(boardId, 'reader'),
                            ]);

                            return tasks;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getTask: streamer({
            req: z.object({taskId: zUuid<TaskId>()}),
            item: zTask().optional(),
            async *stream(st, {taskId}) {
                const task = await st.transact(tx =>
                    tx.tasks.getById(taskId, false)
                );
                if (!task) {
                    throw new BusinessError(
                        `task with id ${taskId} not found`,
                        'task_not_found'
                    );
                }
                yield* observable({
                    async get() {
                        return await st.transact(async tx => {
                            const task = await tx.tasks.getById(taskId, true);
                            if (!task) {
                                return undefined;
                            }
                            await tx.ps.ensureBoardMember(
                                task.boardId,
                                'reader'
                            );

                            return task;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(task.boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getTaskComments: streamer({
            req: z.object({taskId: zUuid<TaskId>()}),
            item: z.array(zCommentDto()),
            async *stream(st, {taskId}) {
                const task = await st.transact(tx =>
                    tx.ps.ensureTaskMember(taskId, 'reader')
                );
                yield* observable({
                    get() {
                        return st.transact(async tx => {
                            await tx.ps.ensureTaskMember(taskId, 'reader');
                            return tx.comments
                                .getByTaskId(taskId)
                                .mapParallel(x => toCommentDto(tx, x.id))
                                .toArray();
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(task.boardId))
                        .then(x => x.map(() => undefined)),
                });
            },
        }),
        getBoardMembers: streamer({
            req: z.object({boardId: zUuid<BoardId>()}),
            item: z.array(zMemberAdminDto()),
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
            req: z.object({
                key: z.string(),
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
            req: z.object({
                key: z.string(),
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
