import {astream} from '../async-stream.js';
import {MsgpackrCodec} from '../codec.js';
import {PULL_WAIT_MS} from '../constants.js';
import {BusinessError} from '../errors.js';
import {Uint8Transaction, withPrefix} from '../kv/kv-store.js';
import {TopicManager} from '../kv/topic-manager.js';
import {getNow} from '../timestamp.js';
import {assertNever, unimplemented, wait, whenAll} from '../utils.js';
import {AuthContext} from './auth-context.js';
import {CoordinatorApi} from './coordinator/coordinator.js';
import {OnDocChange} from './doc-repo.js';
import {Board, BoardId, BoardRepo} from './repos/board-repo.js';
import {Member, MemberRepo, createMemberId} from './repos/member-repo.js';
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
    getMe(input: {}): Promise<User | undefined>;

    getMyBoards(input: {}): Promise<Board[]>;
    getBoard(input: {boardId: BoardId}): Promise<Board | undefined>;
    getBoardTasks(input: {boardId: BoardId}): Promise<Task[]>;
    createBoard(input: CreateBoardModel): Promise<Board>;
    updateBoardName(input: {boardId: BoardId; name: string}): Promise<Board>;
    setBoardSlug(input: {boardId: BoardId; slug: string}): Promise<Board>;

    getTask(input: {taskId: TaskId}): Promise<Task | undefined>;
    updateTaskTitle(input: {taskId: TaskId; title: string}): Promise<Task>;

    createTask(input: CreateTaskModel): Promise<Task>;
}

export interface BaseActorRole<TType extends string> {
    readonly type: TType;
}

export interface CoordinatorActorRole extends BaseActorRole<'coordinator'> {}

export interface ParticipantActorRole extends BaseActorRole<'participant'> {
    readonly coordinator: CoordinatorApi;
}

export type ActorRole = CoordinatorActorRole | ParticipantActorRole;

export class Actor implements DataAccessor {
    private readonly boards: BoardRepo;
    private readonly users: UserRepo;
    private readonly tasks: TaskRepo;
    private readonly members: MemberRepo;

    private changelog: TopicManager<unknown>;

    constructor(
        txn: Uint8Transaction,
        private readonly auth: AuthContext,
        private readonly role: ActorRole
    ) {
        this.users = new UserRepo(
            withPrefix('users/')(txn),
            this.userOnChange.bind(this)
        );
        this.members = new MemberRepo(
            withPrefix('members/')(txn),
            this.memberOnChange.bind(this)
        );
        this.boards = new BoardRepo(
            withPrefix('boards/')(txn),
            this.boardOnChange.bind(this)
        );
        this.tasks = new TaskRepo(
            withPrefix('tasks/')(txn),
            this.taskOnChange.bind(this)
        );

        this.changelog = new TopicManager(
            withPrefix('log/')(txn),
            new MsgpackrCodec()
        );

        if (this.role.type === 'participant') {
            this.startPullLoop().catch(err => {
                console.error('error during pull loop: ', err);
            });
        } else if (this.role.type === 'coordinator') {
            // participant will push changes, nothing to do on coordinator side
        } else {
            assertNever(this.role);
        }
    }

    async getMe(_input: {}): Promise<User | undefined> {
        return await this.users.getById(this.ensureAuthenticated());
    }

    async getMyBoards(_input: {}): Promise<Board[]> {
        const members = this.members.getByUserId(this.ensureAuthenticated());
        return await astream(members)
            .map(member => this.boards.getById(member.boardId))
            .assert(x => x !== undefined)
            .toArray();
    }

    async getBoard(input: {boardId: BoardId}): Promise<Board | undefined> {
        const [board] = await whenAll([
            this.boards.getById(input.boardId),
            this.ensureBoardReadAccess(input.boardId),
        ]);

        return board;
    }

    async getBoardTasks({boardId}: {boardId: BoardId}): Promise<Task[]> {
        const [tasks] = await whenAll([
            this.tasks.getByBoardId(boardId).toArray(),
            this.ensureBoardReadAccess(boardId),
        ]);

        return tasks;
    }

    async createBoard(input: CreateBoardModel): Promise<Board> {
        const now = getNow();
        if (input.slug) {
            if (this.role.type === 'participant') {
                // participant can't set board slug, escalate
                return await this.role.coordinator.createBoard(input);
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
        await this.boards.create(board);
        await this.members.create({
            id: createMemberId(),
            boardId: board.id,
            createdAt: now,
            updatedAt: now,
            userId: userId,
        });

        return board;
    }

    async updateBoardName({
        boardId,
        name,
    }: {
        boardId: BoardId;
        name: string;
    }): Promise<Board> {
        const [board] = await whenAll([
            this.boards.update(boardId, draft => {
                draft.name = name;
            }),
            this.ensureBoardWriteAccess(boardId),
        ]);

        return board;
    }

    async setBoardSlug({
        boardId,
        slug,
    }: {
        boardId: BoardId;
        slug: string;
    }): Promise<Board> {
        if (this.role.type === 'coordinator') {
            const [board] = await whenAll([
                this.boards.update(boardId, draft => {
                    if (draft.slug !== undefined) {
                        throw new BusinessError(
                            'changing board slug is not supported',
                            'board_change_slug_not_supported'
                        );
                    }

                    // remove readonly modifier
                    (draft as {slug: string}).slug = slug;
                }),
                this.ensureBoardWriteAccess(boardId),
            ]);

            return board;
        } else if (this.role.type === 'participant') {
            // participant can't set board slug, escalate
            return await this.role.coordinator.setBoardSlug({boardId, slug});
        } else {
            assertNever(this.role);
        }
    }

    async getTask({taskId}: {taskId: TaskId}): Promise<Task | undefined> {
        const task = await this.tasks.getById(taskId);
        if (!task) {
            return undefined;
        }
        await this.ensureBoardReadAccess(task.boardId);

        return task;
    }

    async createTask({taskId, boardId, title}: CreateTaskModel): Promise<Task> {
        const meId = this.ensureAuthenticated();
        await this.ensureBoardWriteAccess(boardId);
        const now = getNow();

        let counter: number | null;
        if (this.role.type === 'coordinator') {
            counter = await this.boards.incrementBoardCounter(boardId);
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
        await this.tasks.create(task);

        return task;
    }

    async updateTaskTitle({
        taskId,
        title,
    }: {
        taskId: TaskId;
        title: string;
    }): Promise<Task> {
        const task = await this.tasks.update(taskId, draft => {
            draft.title = title;
        });
        await this.ensureBoardWriteAccess(task.boardId);

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

    private async ensureBoardReadAccess(boardId: BoardId): Promise<Member> {
        return await this.ensureBoardWriteAccess(boardId);
    }

    private async ensureBoardWriteAccess(boardId: BoardId): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await this.members.getByUserIdAndBoardId(meId, boardId);
        if (!member) {
            throw new BusinessError(
                `user ${meId} does not have access to board ${boardId}`,
                'forbidden'
            );
        }

        return member;
    }

    private async startPullLoop(): Promise<never> {
        while (true) {
            const noChanges = unimplemented();

            if (noChanges) {
                await wait(PULL_WAIT_MS);
            }
        }
    }
}
