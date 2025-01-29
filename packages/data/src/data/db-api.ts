import {z} from 'zod';
import {astream} from '../async-stream.js';
import {Context} from '../context.js';
import {BusinessError} from '../errors.js';
import {Uint8Transaction, withPrefix} from '../kv/kv-store.js';
import {getNow} from '../timestamp.js';
import {assertNever, whenAll} from '../utils.js';
import {zUuid} from '../uuid.js';
import {AuthContext} from './auth-context.js';
import {EventStoreWriter} from './communication/event-store.js';
import {OnDocChange} from './doc-repo.js';
import {Board, BoardId, BoardRepo, zBoard} from './repos/board-repo.js';
import {createMemberId, Member, MemberRepo} from './repos/member-repo.js';
import {Task, TaskId, TaskRepo, zTask} from './repos/task-repo.js';
import {User, UserId, UserRepo, zUser} from './repos/user-repo.js';
import {createApi, handler, InferRpcClient} from './rpc/rpc.js';

export interface BaseActorRole<TType extends string> {
    readonly type: TType;
}

export interface CoordinatorActorRole extends BaseActorRole<'coordinator'> {}

export interface ParticipantActorRole extends BaseActorRole<'participant'> {
    readonly coordinator: any; // CoordinatorRpc;
}

export type ActorRole = CoordinatorActorRole | ParticipantActorRole;

export class DbApiState {
    public readonly boards: BoardRepo;
    public readonly users: UserRepo;
    public readonly tasks: TaskRepo;
    public readonly members: MemberRepo;

    constructor(
        tx: Uint8Transaction,
        public esWriter: EventStoreWriter<unknown>,
        public readonly auth: AuthContext,
        public readonly role: ActorRole
    ) {
        this.users = new UserRepo(
            withPrefix('users/')(tx),
            this.userOnChange.bind(this)
        );
        this.members = new MemberRepo(
            withPrefix('members/')(tx),
            this.memberOnChange.bind(this)
        );
        this.boards = new BoardRepo(
            withPrefix('boards/')(tx),
            this.boardOnChange.bind(this)
        );
        this.tasks = new TaskRepo(
            withPrefix('tasks/')(tx),
            this.taskOnChange.bind(this)
        );
    }

    public async userOnChange(
        ...[ctx, userId, diff]: Parameters<OnDocChange<User>>
    ): Promise<void> {
        // unimplemented();
    }

    public async memberOnChange(
        ...[ctx, memberId, diff]: Parameters<OnDocChange<Member>>
    ): Promise<void> {
        // unimplemented();
    }

    public async boardOnChange(
        ...[ctx, boardId, diff]: Parameters<OnDocChange<Board>>
    ): Promise<void> {
        // unimplemented();
    }

    public async taskOnChange(
        ...[ctx, taskId, diff]: Parameters<OnDocChange<Task>>
    ): Promise<void> {
        // unimplemented();
    }

    public ensureAuthenticated(): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }

    public async ensureBoardReadAccess(
        ctx: Context,
        boardId: BoardId
    ): Promise<Member> {
        return await this.ensureBoardWriteAccess(ctx, boardId);
    }

    public async ensureBoardWriteAccess(
        ctx: Context,
        boardId: BoardId
    ): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await this.members.getByUserIdAndBoardId(
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

export function createDbApi() {
    return createApi<DbApiState>()({
        getMe: handler({
            req: z.object({}),
            res: zUser().optional(),
            handle: async (ctx, actor) => {
                return await actor.users.getById(
                    ctx,
                    actor.ensureAuthenticated()
                );
            },
        }),
        getMyBoards: handler({
            req: z.object({}),
            res: z.array(zBoard()),
            handle: async (ctx, actor) => {
                const members = actor.members.getByUserId(
                    ctx,
                    actor.ensureAuthenticated()
                );
                return await astream(members)
                    .mapParallel((ctx, member) =>
                        actor.boards.getById(ctx, member.boardId)
                    )
                    .assert(x => x !== undefined)
                    .toArray(ctx);
            },
        }),
        getBoardTasks: handler({
            req: z.object({boardId: zUuid<BoardId>()}),
            res: z.array(zTask()),
            handle: async (ctx, actor, {boardId}) => {
                const [tasks] = await whenAll([
                    actor.tasks.getByBoardId(ctx, boardId).toArray(ctx),
                    actor.ensureBoardReadAccess(ctx, boardId),
                ]);

                return tasks;
            },
        }),
        getTask: handler({
            req: z.object({taskId: zUuid<TaskId>()}),
            res: zTask().optional(),
            handle: async (ctx, actor, {taskId}) => {
                const task = await actor.tasks.getById(ctx, taskId);
                if (!task) {
                    return undefined;
                }
                await actor.ensureBoardReadAccess(ctx, task.boardId);

                return task;
            },
        }),
        createTask: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                boardId: zUuid<BoardId>(),
                title: z.string(),
            }),
            res: zTask(),
            handle: async (ctx, actor, {boardId, taskId, title}) => {
                const meId = actor.ensureAuthenticated();
                await actor.ensureBoardWriteAccess(ctx, boardId);
                const now = getNow();

                let counter: number | null;
                if (actor.role.type === 'coordinator') {
                    counter = await actor.boards.incrementBoardCounter(
                        ctx,
                        boardId
                    );
                } else if (actor.role.type === 'participant') {
                    counter = null;
                } else {
                    assertNever(actor.role);
                }

                const task: Task = {
                    id: taskId,
                    authorId: meId,
                    boardId: boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    title: title,
                    counter,
                };
                await actor.tasks.create(ctx, task);

                return task;
            },
        }),
        createBoard: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
                slug: z.string().optional(),
            }),
            res: zBoard(),
            handle: async (ctx, actor, req) => {
                const now = getNow();
                if (req.slug) {
                    if (actor.role.type === 'participant') {
                        // participant can't set board slug, escalate
                        return await actor.role.coordinator.createBoard(
                            ctx,
                            req
                        );
                    } else if (actor.role.type === 'coordinator') {
                        // coordinator can set board slug, nothing specific to do
                    } else {
                        assertNever(actor.role);
                    }
                }

                const userId = actor.ensureAuthenticated();

                const board: Board = {
                    id: req.boardId,
                    createdAt: now,
                    updatedAt: now,
                    deleted: false,
                    name: req.name,
                    ownerId: userId,
                    slug: req.slug,
                };
                await actor.boards.create(ctx, board);
                await actor.members.create(ctx, {
                    id: createMemberId(),
                    boardId: board.id,
                    createdAt: now,
                    updatedAt: now,
                    userId: userId,
                });

                return board;
            },
        }),
        getBoard: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
            }),
            res: zBoard().optional(),
            handle: async (ctx, actor, req) => {
                const [board] = await whenAll([
                    actor.boards.getById(ctx, req.boardId),
                    actor.ensureBoardReadAccess(ctx, req.boardId),
                ]);

                return board;
            },
        }),
        setBoardSlug: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                slug: z.string(),
            }),
            res: zBoard(),
            handle: async (ctx, actor, {boardId, slug}) => {
                if (actor.role.type === 'coordinator') {
                    const [board] = await whenAll([
                        actor.boards.update(ctx, boardId, draft => {
                            if (draft.slug !== undefined) {
                                throw new BusinessError(
                                    'changing board slug is not supported',
                                    'board_change_slug_not_supported'
                                );
                            }

                            // remove readonly modifier
                            (draft as {slug: string}).slug = slug;
                        }),
                        actor.ensureBoardWriteAccess(ctx, boardId),
                    ]);

                    return board;
                } else if (actor.role.type === 'participant') {
                    // participant can't set board slug, escalate
                    return await actor.role.coordinator.setBoardSlug(ctx, {
                        boardId,
                        slug,
                    });
                } else {
                    assertNever(actor.role);
                }
            },
        }),
        updateBoardName: handler({
            req: z.object({
                boardId: zUuid<BoardId>(),
                name: z.string(),
            }),
            res: zBoard(),
            handle: async (ctx, actor, {boardId, name}) => {
                const [board] = await whenAll([
                    actor.boards.update(ctx, boardId, draft => {
                        draft.name = name;
                    }),
                    actor.ensureBoardWriteAccess(ctx, boardId),
                ]);

                return board;
            },
        }),
        updateTaskTitle: handler({
            req: z.object({
                taskId: zUuid<TaskId>(),
                title: z.string(),
            }),
            res: zTask(),
            handle: async (ctx, actor, {taskId, title}) => {
                const task = await actor.tasks.update(ctx, taskId, draft => {
                    draft.title = title;
                });
                await actor.ensureBoardWriteAccess(ctx, task.boardId);

                return task;
            },
        }),
    });
}

export type DbApiRpc = InferRpcClient<ReturnType<typeof createDbApi>>;
