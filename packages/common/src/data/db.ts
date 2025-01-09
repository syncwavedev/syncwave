import Delta from 'quill-delta';
import {astream} from '../async-stream';
import {MsgpackrEncoder} from '../encoder';
import {Uint8Transaction, withPrefix} from '../kv/kv-store';
import {TopicManager} from '../kv/topic-manager';
import {Richtext} from '../richtext';
import {getNow} from '../timestamp';
import {unimplemented} from '../utils';
import {AuthContext} from './auth-context';
import {OnDocChange} from './doc-repo';
import {Board, BoardId, BoardRepo} from './repos/board-repo';
import {Member, MemberRepo} from './repos/member-repo';
import {Task, TaskId, TaskRepo, createTaskId} from './repos/task-repo';
import {User, UserId, UserRepo} from './repos/user-repo';

export interface CreateTaskModel {
    boardId: BoardId;
    title: string;
    text: string;
}

export interface DataAccessor {
    getMe(input: {}): Promise<User | undefined>;
    getMyBoards(input: {userId: UserId}): Promise<Board[]>;
    getBoardTasks(input: {boardId: BoardId}): Promise<Task[]>;
    getTask(input: {taskId: TaskId}): Promise<Task | undefined>;
    createTask(input: CreateTaskModel): Promise<Task>;
}

export class Db implements DataAccessor {
    private readonly boards: BoardRepo;
    private readonly users: UserRepo;
    private readonly tasks: TaskRepo;
    private readonly members: MemberRepo;

    private changelog: TopicManager<unknown>;

    constructor(
        txn: Uint8Transaction,
        private readonly auth: AuthContext,
        private readonly mode: 'coordinator' | 'participant'
    ) {
        this.users = new UserRepo(withPrefix('users/')(txn), this.userOnChange.bind(this));
        this.members = new MemberRepo(withPrefix('members/')(txn), this.memberOnChange.bind(this));
        this.boards = new BoardRepo(withPrefix('boards/')(txn), this.boardOnChange.bind(this));
        this.tasks = new TaskRepo(withPrefix('tasks/')(txn), this.taskOnChange.bind(this));

        this.changelog = new TopicManager(withPrefix('log/')(txn), new MsgpackrEncoder());
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

    async getBoardTasks({boardId}: {boardId: BoardId}): Promise<Task[]> {
        const [tasks] = await Promise.all([
            this.tasks.getByBoardId(boardId).toArray(),
            this.ensureBoardAccess(boardId),
        ]);

        return tasks;
    }

    async getTask({taskId}: {taskId: TaskId}): Promise<Task | undefined> {
        const task = await this.tasks.getById(taskId);
        if (!task) {
            return undefined;
        }
        await this.ensureBoardAccess(task.boardId);

        return task;
    }

    async createTask({boardId, text, title}: CreateTaskModel): Promise<Task> {
        const meId = this.ensureAuthenticated();
        await this.ensureBoardAccess(boardId);
        const now = getNow();
        const task: Task = {
            id: createTaskId(),
            authorId: meId,
            boardId: boardId,
            createdAt: now,
            updatedAt: now,
            deleted: false,
            text: new Richtext(new Delta().insert(text)),
            title: title,
            counter: await this.boards.incrementBoardCounter(boardId),
        };
        await this.tasks.create(task);

        return task;
    }

    private userOnChange(...[userId, diff]: Parameters<OnDocChange<User>>): never {
        unimplemented();
    }

    private memberOnChange(...[memberId, diff]: Parameters<OnDocChange<Member>>): never {
        unimplemented();
    }

    private boardOnChange(...[boardId, diff]: Parameters<OnDocChange<Board>>): never {
        unimplemented();
    }

    private taskOnChange(...[taskId, diff]: Parameters<OnDocChange<Task>>): never {
        unimplemented();
    }

    private ensureAuthenticated(): UserId {
        if (this.auth.userId === undefined) {
            throw new Error('user is not authenticated');
        }

        return this.auth.userId;
    }

    private async ensureBoardAccess(boardId: BoardId): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await this.members.getByUserIdAndBoardId(meId, boardId);
        if (!member) {
            throw new Error(`user ${meId} does not have access to board ${boardId}`);
        }

        return member;
    }
}
