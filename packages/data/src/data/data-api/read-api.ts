import {z} from 'zod';
import {astream} from '../../async-stream.js';
import {Cx} from '../../context.js';
import {BusinessError} from '../../errors.js';
import {assert, observable, whenAll} from '../../utils.js';
import {zUuid} from '../../uuid.js';
import {AuthContext} from '../auth-context.js';
import {EventStoreReader} from '../communication/event-store.js';
import {
    boardEvents,
    ChangeEvent,
    DataTx,
    Transact,
    userEvents,
} from '../data-layer.js';
import {BoardId, zBoard} from '../repos/board-repo.js';
import {Member} from '../repos/member-repo.js';
import {TaskId, zTask} from '../repos/task-repo.js';
import {UserId, zUser} from '../repos/user-repo.js';
import {createApi, InferRpcClient, observer} from '../rpc/rpc.js';

export class ReadApiState {
    constructor(
        public readonly transact: Transact,
        readonly esReader: EventStoreReader<ChangeEvent>,
        public readonly auth: AuthContext
    ) {}

    ensureAuthenticated(cx: Cx): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                cx,
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }

    async ensureBoardReadAccess(
        cx: Cx,
        tx: DataTx,
        boardId: BoardId
    ): Promise<Member> {
        return await this.ensureBoardWriteAccess(cx, tx, boardId);
    }

    async ensureBoardWriteAccess(
        cx: Cx,
        tx: DataTx,
        boardId: BoardId
    ): Promise<Member> {
        const meId = this.ensureAuthenticated(cx);
        const member = await tx.members.getByUserIdAndBoardId(
            cx,
            meId,
            boardId
        );
        if (!member) {
            throw new BusinessError(
                cx,
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
            value: zUser(),
            observe: async (cx, st) => {
                const userId = st.ensureAuthenticated(cx);

                return observable(cx, {
                    async get(cx: Cx) {
                        return await st.transact(cx, async (cx, tx) => {
                            const user = await tx.users.getById(cx, userId);
                            assert(cx, user !== undefined);
                            return user;
                        });
                    },
                    update$: st.esReader.subscribe(cx, userEvents(userId)),
                });
            },
        }),
        getMyBoards: observer({
            req: z.object({}),
            value: z.array(zBoard()),
            observe: async (cx, st) => {
                const userId = st.ensureAuthenticated(cx);

                return observable(cx, {
                    async get(cx) {
                        return st.transact(cx, async (cx, tx) => {
                            const members = tx.members.getByUserId(cx, userId);
                            return await astream(members)
                                .mapParallel((cx, member) =>
                                    tx.boards.getById(cx, member.boardId)
                                )
                                .assert((cx, x) => x !== undefined)
                                .toArray(cx);
                        });
                    },
                    update$: st.esReader.subscribe(cx, userEvents(userId)),
                });
            },
        }),
        getBoardTasks: observer({
            req: z.object({boardId: zUuid<BoardId>()}),
            value: z.array(zTask()),
            observe: async (cx, st, {boardId}) => {
                return observable(cx, {
                    async get(cx) {
                        return await st.transact(cx, async (cx, tx) => {
                            const [tasks] = await whenAll(cx, [
                                tx.tasks.getByBoardId(cx, boardId).toArray(cx),
                                st.ensureBoardReadAccess(cx, tx, boardId),
                            ]);

                            return tasks;
                        });
                    },
                    update$: st.esReader.subscribe(cx, boardEvents(boardId)),
                });
            },
        }),
        getTask: observer({
            req: z.object({taskId: zUuid<TaskId>()}),
            value: zTask().optional(),
            observe: async (cx, st, {taskId}) => {
                const task = await st.transact(cx, (cx, tx) =>
                    tx.tasks.getById(cx, taskId)
                );
                if (!task) {
                    throw new BusinessError(
                        cx,
                        `task with id ${taskId} not found`,
                        'task_not_found'
                    );
                }
                return observable(cx, {
                    async get(cx) {
                        return await st.transact(cx, async (cx, tx) => {
                            const task = await tx.tasks.getById(cx, taskId);
                            if (!task) {
                                return undefined;
                            }
                            await st.ensureBoardReadAccess(
                                cx,
                                tx,
                                task.boardId
                            );

                            return task;
                        });
                    },
                    update$: st.esReader.subscribe(
                        cx,
                        boardEvents(task.boardId)
                    ),
                });
            },
        }),
        getBoard: observer({
            req: z.object({
                boardId: zUuid<BoardId>(),
            }),
            value: zBoard().optional(),
            observe: async (cx, st, {boardId}) => {
                return observable(cx, {
                    async get(cx) {
                        return await st.transact(cx, async (cx, tx) => {
                            const [board] = await whenAll(cx, [
                                tx.boards.getById(cx, boardId),
                                st.ensureBoardReadAccess(cx, tx, boardId),
                            ]);

                            return board;
                        });
                    },
                    update$: st.esReader.subscribe(cx, boardEvents(boardId)),
                });
            },
        }),
    });
}

export type ReadApiRpc = InferRpcClient<ReturnType<typeof createReadApi>>;
