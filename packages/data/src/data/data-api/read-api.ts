import {z} from 'zod';
import {astream} from '../../async-stream.js';
import {Context} from '../../context.js';
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

    ensureAuthenticated(): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }

    async ensureBoardReadAccess(
        ctx: Context,
        tx: DataTx,
        boardId: BoardId
    ): Promise<Member> {
        return await this.ensureBoardWriteAccess(ctx, tx, boardId);
    }

    async ensureBoardWriteAccess(
        ctx: Context,
        tx: DataTx,
        boardId: BoardId
    ): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await tx.members.getByUserIdAndBoardId(
            ctx,
            meId,
            boardId
        );
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
            value: zUser(),
            observe: async (ctx, st) => {
                const userId = st.ensureAuthenticated();

                return observable(ctx, {
                    async get(ctx: Context) {
                        return await st.transact(ctx, async (ctx, tx) => {
                            const user = await tx.users.getById(ctx, userId);
                            assert(user !== undefined);
                            return user;
                        });
                    },
                    update$: st.esReader.subscribe(ctx, userEvents(userId)),
                });
            },
        }),
        getMyBoards: observer({
            req: z.object({}),
            value: z.array(zBoard()),
            observe: async (ctx, st) => {
                const userId = st.ensureAuthenticated();

                return observable(ctx, {
                    async get(ctx) {
                        return st.transact(ctx, async (ctx, tx) => {
                            const members = tx.members.getByUserId(ctx, userId);
                            return await astream(members)
                                .mapParallel((ctx, member) =>
                                    tx.boards.getById(ctx, member.boardId)
                                )
                                .assert(x => x !== undefined)
                                .toArray(ctx);
                        });
                    },
                    update$: st.esReader.subscribe(ctx, userEvents(userId)),
                });
            },
        }),
        getBoardTasks: observer({
            req: z.object({boardId: zUuid<BoardId>()}),
            value: z.array(zTask()),
            observe: async (ctx, st, {boardId}) => {
                return observable(ctx, {
                    async get(ctx) {
                        return await st.transact(ctx, async (ctx, tx) => {
                            const [tasks] = await whenAll([
                                tx.tasks
                                    .getByBoardId(ctx, boardId)
                                    .toArray(ctx),
                                st.ensureBoardReadAccess(ctx, tx, boardId),
                            ]);

                            return tasks;
                        });
                    },
                    update$: st.esReader.subscribe(ctx, boardEvents(boardId)),
                });
            },
        }),
        getTask: observer({
            req: z.object({taskId: zUuid<TaskId>()}),
            value: zTask().optional(),
            observe: async (ctx, st, {taskId}) => {
                const task = await st.transact(ctx, (ctx, tx) =>
                    tx.tasks.getById(ctx, taskId)
                );
                if (!task) {
                    throw new BusinessError(
                        `task with id ${taskId} not found`,
                        'task_not_found'
                    );
                }
                return observable(ctx, {
                    async get(ctx) {
                        return await st.transact(ctx, async (ctx, tx) => {
                            const task = await tx.tasks.getById(ctx, taskId);
                            if (!task) {
                                return undefined;
                            }
                            await st.ensureBoardReadAccess(
                                ctx,
                                tx,
                                task.boardId
                            );

                            return task;
                        });
                    },
                    update$: st.esReader.subscribe(
                        ctx,
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
            observe: async (ctx, st, {boardId}) => {
                return observable(ctx, {
                    async get(ctx) {
                        return await st.transact(ctx, async (ctx, tx) => {
                            const [board] = await whenAll([
                                tx.boards.getById(ctx, boardId),
                                st.ensureBoardReadAccess(ctx, tx, boardId),
                            ]);

                            return board;
                        });
                    },
                    update$: st.esReader.subscribe(ctx, boardEvents(boardId)),
                });
            },
        }),
    });
}

export type ReadApiRpc = InferRpcClient<ReturnType<typeof createReadApi>>;
