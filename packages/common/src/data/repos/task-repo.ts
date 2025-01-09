import {AsyncStream} from '../../async-stream';
import {Uint8Transaction} from '../../kv/kv-store';
import {Richtext} from '../../richtext';
import {Timestamp} from '../../timestamp';
import {Brand, unimplemented} from '../../utils';
import {Uuid} from '../../uuid';
import {Doc} from '../doc-repo';
import {BoardId} from './board-repo';
import {UserId} from './user-repo';

export type TaskId = Brand<Uuid, 'task_id'>;

export interface Task extends Doc<TaskId> {
    authorId: UserId;
    boardId: BoardId;
    title: string;
    text: Richtext;
    meta: TaskMeta;
    deleted: boolean;
}

export interface TaskMeta {
    createdAt: Timestamp;
}

export class TaskRepo {
    constructor(private readonly txn: Uint8Transaction) {}

    getById(taskId: TaskId): Promise<Task | undefined> {
        unimplemented();
    }
    getByAuthorId(authorId: TaskId): AsyncStream<Task> {
        unimplemented();
    }
    getByBoardId(boardId: BoardId): AsyncStream<Task> {
        unimplemented();
    }
}
