import {z} from 'zod';
import {BusinessError} from '../errors.js';
import {log} from '../logger.js';
import {observable, toStream} from '../stream.js';
import {createApi, InferRpcClient, observer} from '../transport/rpc.js';
import {assert, whenAll} from '../utils.js';
import {zUuid} from '../uuid.js';
import {AuthContext} from './auth-context.js';
import {
    boardEvents,
    ChangeEvent,
    DataTx,
    Transact,
    userEvents,
} from './data-layer.js';
import {EventStoreReader} from './event-store.js';
import {BoardId, zBoard} from './repos/board-repo.js';
import {zColumn} from './repos/column-repo.js';
import {zIdentity} from './repos/identity-repo.js';
import {Member} from './repos/member-repo.js';
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

    async ensureBoardReadAccess(tx: DataTx, boardId: BoardId): Promise<Member> {
        return await this.ensureBoardWriteAccess(tx, boardId);
    }

    async ensureBoardWriteAccess(
        tx: DataTx,
        boardId: BoardId
    ): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await tx.members.getByUserIdAndBoardId(meId, boardId);
        if (!member) {
            throw new BusinessError(
                `user ${meId} does not have access to board ${boardId}`,
                'forbidden'
            );
        }

        return member;
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
                            const user = await tx.users.getById(userId);
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
            value: z.array(zBoard()),
            update: z.array(zBoard()),
            observe: async st => {
                const userId = st.ensureAuthenticated();

                return observable({
                    async get() {
                        return st.transact(async tx => {
                            const members = tx.members.getByUserId(userId);
                            return await toStream(members)
                                .mapParallel(member =>
                                    tx.boards.getById(member.boardId)
                                )
                                .assert(x => x !== undefined)
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
                                st.ensureBoardReadAccess(tx, boardId),
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
                const task = await st.transact(tx => tx.tasks.getById(taskId));
                if (!task) {
                    throw new BusinessError(
                        `task with id ${taskId} not found`,
                        'task_not_found'
                    );
                }
                return observable({
                    async get() {
                        return await st.transact(async tx => {
                            const task = await tx.tasks.getById(taskId);
                            if (!task) {
                                return undefined;
                            }
                            await st.ensureBoardReadAccess(tx, task.boardId);

                            return task;
                        });
                    },
                    update$: st.esReader
                        .subscribe(boardEvents(task.boardId))
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
                                tx.boards.getById(boardId),
                                st.ensureBoardReadAccess(tx, boardId),
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
                board: zBoard(),
                columns: z.array(zColumn()),
                tasks: z.array(zTask()),
            }),
            update: z.object({
                board: zBoard(),
                columns: z.array(zColumn()),
                tasks: z.array(zTask()),
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
                                tx.boards.getById(boardId),
                                st.ensureBoardReadAccess(tx, boardId),
                            ]);
                            if (board === undefined) {
                                throw new BusinessError(
                                    `board with key ${key} not found`,
                                    'board_not_found'
                                );
                            }

                            const [columns, tasks] = await whenAll([
                                tx.columns.getByBoardId(boardId).toArray(),
                                tx.tasks.getByBoardId(boardId).toArray(),
                            ]);

                            return {board, columns, tasks};
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
