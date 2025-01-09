import {Task} from 'vitest';
import {MsgpackrEncoder} from '../encoder';
import {Uint8Transaction, withPrefix} from '../kv/kv-store';
import {TopicManager} from '../kv/topic-manager';
import {unimplemented} from '../utils';
import {AuthContext} from './auth-context';
import {OnDocChange} from './doc-repo';
import {Board, BoardId, BoardRepo} from './repos/board-repo';
import {TaskId, TaskRepo} from './repos/task-repo';
import {User, UserId, UserRepo} from './repos/user-repo';

export interface DataAccessor {
    getMe(input: {}): Promise<User | undefined>;
    getBoards(input: {userId: UserId}): Promise<Board[]>;
    getBoardTasks(input: {boardId: BoardId}): Promise<Task[]>;
    getTask(input: {taskId: TaskId}): Promise<Task>;
}

export class Db implements DataAccessor {
    private readonly boards: BoardRepo;
    private readonly users: UserRepo;
    private readonly tasks: TaskRepo;

    private changelog: TopicManager<unknown>;

    constructor(
        txn: Uint8Transaction,
        private readonly authContext: AuthContext
    ) {
        this.boards = new BoardRepo(withPrefix('boards/')(txn));
        this.users = new UserRepo(withPrefix('users/')(txn), this.userOnChange.bind(this));
        this.tasks = new TaskRepo(withPrefix('tasks/')(txn));

        this.changelog = new TopicManager(withPrefix('log/')(txn), new MsgpackrEncoder());
    }

    getMe(input: {}): Promise<User | undefined> {
        unimplemented();
    }

    getBoards(input: {userId: UserId}): Promise<Board[]> {
        unimplemented();
    }

    getBoardTasks(input: {boardId: BoardId}): Promise<Task[]> {
        unimplemented();
    }

    getTask(input: {taskId: TaskId}): Promise<Task> {
        unimplemented();
    }

    private userOnChange(...[userId, diff]: Parameters<OnDocChange<User>>): never {
        unimplemented();
    }
}
