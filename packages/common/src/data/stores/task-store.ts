import {Crdt, CrdtEncoder} from '../../crdt/crdt';
import {Uint8Transaction, withKeySerializer, withPrefix, withValueSerializer} from '../../kv/kv-store';
import {Richtext} from '../../richtext';
import {Brand, pipe} from '../../utils';
import {Uuid, UuidEncoder} from '../../uuid';
import {Timestamp} from '../timestamp';
import {BoardId} from './board-store';
import {UserId} from './user-store';

type TaskId = Brand<Uuid, 'task_id'>;

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

export interface TaskRepository {
    getById(taskId: TaskId): Promise<Crdt<Task> | undefined>;
    getByAuthorId(authorId: TaskId): Promise<AsyncIterator<Crdt<Task>>>;
    getByBoardId(authorId: TaskId): Promise<AsyncIterator<Crdt<Task>>>;
}

export function getTaskStore(txn: Uint8Transaction): TaskRepository {
    const primaryIndex = pipe(
        txn,
        withPrefix('tasks/primary/'),
        withKeySerializer(new UuidEncoder()),
        withValueSerializer(new CrdtEncoder())
    );

    throw new Error('not implemented');
}
