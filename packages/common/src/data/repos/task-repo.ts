import {Crdt} from '../../crdt/crdt';
import {Uint8Transaction} from '../../kv/kv-store';
import {Richtext} from '../../richtext';
import {Brand} from '../../utils';
import {Uuid} from '../../uuid';
import {Timestamp} from '../timestamp';
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

export interface TaskRepo {
    getById(taskId: TaskId): Promise<Crdt<Task> | undefined>;
    getByAuthorId(authorId: TaskId): Promise<AsyncIterator<Crdt<Task>>>;
    getByBoardId(authorId: TaskId): Promise<AsyncIterator<Crdt<Task>>>;
}

export function getTaskStore(txn: Uint8Transaction): TaskRepo {
    throw new Error('not implemented');
}
