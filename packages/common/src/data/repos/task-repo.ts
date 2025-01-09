import {Crdt} from '../../crdt/crdt';
import {Uint8Transaction} from '../../kv/kv-store';
import {Richtext} from '../../richtext';
import {Timestamp} from '../../timestamp';
import {Brand, unimplemented} from '../../utils';
import {Uuid} from '../../uuid';
import {BoardId} from './board-repo';
import {UserId} from './user-repo';

export type TaskId = Brand<Uuid, 'task_id'>;

export interface Task {
    id: TaskId;
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

    getById(taskId: TaskId): Promise<Crdt<Task> | undefined> {
        unimplemented();
    }
    getByAuthorId(authorId: TaskId): Promise<AsyncIterator<Crdt<Task>>> {
        unimplemented();
    }
    getByBoardId(authorId: TaskId): Promise<AsyncIterator<Crdt<Task>>> {
        unimplemented();
    }
}
