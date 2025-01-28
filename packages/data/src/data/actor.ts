import {astream} from '../async-stream.js';
import {MsgpackCodec} from '../codec.js';
import {Context} from '../context.js';
import {BusinessError} from '../errors.js';
import {Uint8Transaction, withPrefix} from '../kv/kv-store.js';
import {TopicManager} from '../kv/topic-manager.js';
import {getNow} from '../timestamp.js';
import {assertNever, whenAll} from '../utils.js';
import {AuthContext} from './auth-context.js';
import {CoordinatorRpc} from './coordinator/coordinator-api.js';
import {OnDocChange} from './doc-repo.js';
import {Board, BoardId, BoardRepo} from './repos/board-repo.js';
import {createMemberId, Member, MemberRepo} from './repos/member-repo.js';
import {Task, TaskId, TaskRepo} from './repos/task-repo.js';
import {User, UserId, UserRepo} from './repos/user-repo.js';

export interface CreateTaskModel {
    taskId: TaskId;
    boardId: BoardId;
    title: string;
}

export interface CreateBoardModel {
    boardId: BoardId;
    name: string;
    slug?: string;
}

export interface DataAccessor {
    getMe(ctx: Context, input: {}): Promise<User | undefined>;

    getMyBoards(ctx: Context, input: {}): Promise<Board[]>;
    getBoard(
        ctx: Context,
        input: {boardId: BoardId}
    ): Promise<Board | undefined>;
    getBoardTasks(ctx: Context, input: {boardId: BoardId}): Promise<Task[]>;
    createBoard(ctx: Context, input: CreateBoardModel): Promise<Board>;
    updateBoardName(
        ctx: Context,
        input: {boardId: BoardId; name: string}
    ): Promise<Board>;
    setBoardSlug(
        ctx: Context,
        input: {boardId: BoardId; slug: string}
    ): Promise<Board>;

    getTask(ctx: Context, input: {taskId: TaskId}): Promise<Task | undefined>;
    updateTaskTitle(
        ctx: Context,
        input: {taskId: TaskId; title: string}
    ): Promise<Task>;

    createTask(ctx: Context, input: CreateTaskModel): Promise<Task>;
}

export interface BaseActorRole<TType extends string> {
    readonly type: TType;
}

export interface CoordinatorActorRole extends BaseActorRole<'coordinator'> {}

export interface ParticipantActorRole extends BaseActorRole<'participant'> {
    readonly coordinator: CoordinatorRpc;
}

export type ActorRole = CoordinatorActorRole | ParticipantActorRole;

export class Actor implements DataAccessor {
    private readonly boards: BoardRepo;
    private readonly users: UserRepo;
    private readonly tasks: TaskRepo;
    private readonly members: MemberRepo;

    private changelog: TopicManager<unknown>;

    constructor(
        tx: Uint8Transaction,
        private readonly auth: AuthContext,
        private readonly role: ActorRole
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

        this.changelog = new TopicManager(
            withPrefix('log/')(tx),
            new MsgpackCodec()
        );
    }

    async getMe(ctx: Context, _input: {}): Promise<User | undefined> {
        return await this.users.getById(ctx, this.ensureAuthenticated());
    }

    async getMyBoards(ctx: Context, _input: {}): Promise<Board[]> {
        const members = this.members.getByUserId(
            ctx,
            this.ensureAuthenticated()
        );
        return await astream(members)
            .mapParallel((ctx, member) =>
                this.boards.getById(ctx, member.boardId)
            )
            .assert(x => x !== undefined)
            .toArray(ctx);
    }

    async getBoard(
        ctx: Context,
        input: {boardId: BoardId}
    ): Promise<Board | undefined> {
        const [board] = await whenAll([
            this.boards.getById(ctx, input.boardId),
            this.ensureBoardReadAccess(ctx, input.boardId),
        ]);

        return board;
    }

    async getBoardTasks(
        ctx: Context,
        {boardId}: {boardId: BoardId}
    ): Promise<Task[]> {
        const [tasks] = await whenAll([
            this.tasks.getByBoardId(ctx, boardId).toArray(ctx),
            this.ensureBoardReadAccess(ctx, boardId),
        ]);

        return tasks;
    }

    async createBoard(ctx: Context, input: CreateBoardModel): Promise<Board> {
        const now = getNow();
        if (input.slug) {
            if (this.role.type === 'participant') {
                // participant can't set board slug, escalate
                return await this.role.coordinator.createBoard(ctx, input);
            } else if (this.role.type === 'coordinator') {
                // coordinator can set board slug, nothing specific to do
            } else {
                assertNever(this.role);
            }
        }

        const userId = this.ensureAuthenticated();

        const board: Board = {
            id: input.boardId,
            createdAt: now,
            updatedAt: now,
            deleted: false,
            name: input.name,
            ownerId: userId,
            slug: input.slug,
        };
        await this.boards.create(ctx, board);
        await this.members.create(ctx, {
            id: createMemberId(),
            boardId: board.id,
            createdAt: now,
            updatedAt: now,
            userId: userId,
        });

        return board;
    }

    async updateBoardName(
        ctx: Context,
        {
            boardId,
            name,
        }: {
            boardId: BoardId;
            name: string;
        }
    ): Promise<Board> {
        const [board] = await whenAll([
            this.boards.update(ctx, boardId, draft => {
                draft.name = name;
            }),
            this.ensureBoardWriteAccess(ctx, boardId),
        ]);

        return board;
    }

    async setBoardSlug(
        ctx: Context,
        {
            boardId,
            slug,
        }: {
            boardId: BoardId;
            slug: string;
        }
    ): Promise<Board> {
        if (this.role.type === 'coordinator') {
            const [board] = await whenAll([
                this.boards.update(ctx, boardId, draft => {
                    if (draft.slug !== undefined) {
                        throw new BusinessError(
                            'changing board slug is not supported',
                            'board_change_slug_not_supported'
                        );
                    }

                    // remove readonly modifier
                    (draft as {slug: string}).slug = slug;
                }),
                this.ensureBoardWriteAccess(ctx, boardId),
            ]);

            return board;
        } else if (this.role.type === 'participant') {
            // participant can't set board slug, escalate
            return await this.role.coordinator.setBoardSlug(ctx, {
                boardId,
                slug,
            });
        } else {
            assertNever(this.role);
        }
    }

    async getTask(
        ctx: Context,
        {taskId}: {taskId: TaskId}
    ): Promise<Task | undefined> {
        const task = await this.tasks.getById(ctx, taskId);
        if (!task) {
            return undefined;
        }
        await this.ensureBoardReadAccess(ctx, task.boardId);

        return task;
    }

    async createTask(
        ctx: Context,
        {taskId, boardId, title}: CreateTaskModel
    ): Promise<Task> {
        const meId = this.ensureAuthenticated();
        await this.ensureBoardWriteAccess(ctx, boardId);
        const now = getNow();

        let counter: number | null;
        if (this.role.type === 'coordinator') {
            counter = await this.boards.incrementBoardCounter(ctx, boardId);
        } else if (this.role.type === 'participant') {
            counter = null;
        } else {
            assertNever(this.role);
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
        await this.tasks.create(ctx, task);

        return task;
    }

    async updateTaskTitle(
        ctx: Context,
        {
            taskId,
            title,
        }: {
            taskId: TaskId;
            title: string;
        }
    ): Promise<Task> {
        const task = await this.tasks.update(ctx, taskId, draft => {
            draft.title = title;
        });
        await this.ensureBoardWriteAccess(ctx, task.boardId);

        return task;
    }

    private async userOnChange(
        ...[userId, diff]: Parameters<OnDocChange<User>>
    ): Promise<void> {
        // unimplemented();
    }

    private async memberOnChange(
        ...[memberId, diff]: Parameters<OnDocChange<Member>>
    ): Promise<void> {
        // unimplemented();
    }

    private async boardOnChange(
        ...[boardId, diff]: Parameters<OnDocChange<Board>>
    ): Promise<void> {
        // unimplemented();
    }

    private async taskOnChange(
        ...[taskId, diff]: Parameters<OnDocChange<Task>>
    ): Promise<void> {
        // unimplemented();
    }

    private ensureAuthenticated(): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }

    private async ensureBoardReadAccess(
        ctx: Context,
        boardId: BoardId
    ): Promise<Member> {
        return await this.ensureBoardWriteAccess(ctx, boardId);
    }

    private async ensureBoardWriteAccess(
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
