import {z} from 'zod';
import {BusinessError} from '../errors.js';
import {log} from '../logger.js';
import {observable, toStream} from '../stream.js';
import {createApi, InferRpcClient, observer} from '../transport/rpc.js';
import {assert, whenAll} from '../utils.js';
import {zUuid} from '../uuid.js';
import {AuthContext} from './auth-context.js';
import {boardEvents, ChangeEvent, Transact, userEvents} from './data-layer.js';
import {
    toBoardDto,
    toColumnDto,
    toCommentDto,
    toMemberAdminDto,
    toTaskDto,
    zBoardDto,
    zColumnDto,
    zCommentDto,
    zMemberAdminDto,
    zTaskDto,
} from './dto.js';
import {EventStoreReader} from './event-store.js';
import {BoardId, zBoard} from './repos/board-repo.js';
import {zIdentity} from './repos/identity-repo.js';
import {TaskId, zTask} from './repos/task-repo.js';
import {UserId, zUser} from './repos/user-repo.js';

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
        getMe: observer({
            req: z.object({}),
            value: z.object({
                user: zUser(),
                identity: zIdentity(),
            }),
            update: z.object({
                user: zUser(),
                identity: zIdentity(),
            }),
            observe: async st => {
                const userId = st.ensureAuthenticated();

                return observable({
                    async get() {
                        return await st.transact(async tx => {
                            const user = await tx.users.getById(userId, true);
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
        getMyBoards: observer({
            req: z.object({}),
            value: z.array(zBoardDto()),
            update: z.array(zBoardDto()),
            observe: async st => {
                const userId = st.ensureAuthenticated();

                return observable({
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
        getBoardTasks: observer({
            req: z.object({boardId: zUuid<BoardId>()}),
            value: z.array(zTask()),
            update: z.array(zTask()),
            observe: async (st, {boardId}) => {
                return observable({
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
        getTask: observer({
            req: z.object({taskId: zUuid<TaskId>()}),
            value: zTask().optional(),
            update: zTask().optional(),
            observe: async (st, {taskId}) => {
                const task = await st.transact(tx =>
                    tx.tasks.getById(taskId, false)
                );
                if (!task) {
                    throw new BusinessError(
                        `task with id ${taskId} not found`,
                        'task_not_found'
                    );
                }
                return observable({
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
        getTaskComments: observer({
            req: z.object({taskId: zUuid<TaskId>()}),
            value: z.array(zCommentDto()),
            update: z.array(zCommentDto()),
            observe: async (st, {taskId}) => {
                const task = await st.transact(tx =>
                    tx.ps.ensureTaskMember(taskId, 'reader')
                );
                return observable({
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
        getBoardMembers: observer({
            req: z.object({boardId: zUuid<BoardId>()}),
            value: z.array(zMemberAdminDto()),
            update: z.array(zMemberAdminDto()),
            observe: async (st, {boardId}) => {
                return observable({
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
        getBoard: observer({
            req: z.object({
                key: z.string(),
            }),
            value: zBoard(),
            update: zBoard(),
            observe: async (st, {key}) => {
                const board = await st.transact(tx => tx.boards.getByKey(key));
                if (board === undefined) {
                    throw new BusinessError(
                        `board with key ${key} not found`,
                        'board_not_found'
                    );
                }
                const boardId = board.id;
                return observable({
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
        getBoardView: observer({
            req: z.object({
                key: z.string(),
            }),
            value: z.object({
                board: zBoardDto(),
                columns: z.array(zColumnDto()),
                tasks: z.array(zTaskDto()),
            }),
            update: z.object({
                board: zBoardDto(),
                columns: z.array(zColumnDto()),
                tasks: z.array(zTaskDto()),
            }),
            observe: async (st, {key}) => {
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
                return observable({
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

                            const [columns, tasks] = await whenAll([
                                tx.columns
                                    .getByBoardId(boardId)
                                    .mapParallel(x => toColumnDto(tx, x.id))
                                    .toArray(),
                                tx.tasks
                                    .getByBoardId(boardId)
                                    .mapParallel(x => toTaskDto(tx, x.id))
                                    .toArray(),
                            ]);

                            return {
                                board: await toBoardDto(tx, board.id),
                                columns: columns,
                                tasks,
                            };
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
