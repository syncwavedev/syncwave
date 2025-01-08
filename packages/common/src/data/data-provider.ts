import {Task} from 'vitest';
import {Board, BoardId} from './repos/board-repo';
import {TaskId} from './repos/task-repo';
import {User, UserId} from './repos/user-repo';

export interface Db {
    getMe(input: {}): Promise<User | undefined>;
    getBoards(input: {userId: UserId}): Promise<Board[]>;
    getBoardTasks(input: {boardId: BoardId}): Promise<Task[]>;
    getTask(input: {taskId: TaskId}): Promise<Task>;
}
