import {CrdtSerializer} from './crdt-serializer';
import {Crdt, CrdtDiff} from './crdt/crdt';
import {Uint8KVStore, Uint8Transaction} from './kv/key-value-store';
import {withKeySerializer, withPrefix, withValueSerializer} from './kv/kv-store-utils';
import {Richtext} from './richtext';
import {StringSerializer} from './string-serializer';
import {Brand, pipe} from './utils';
import {Uuid, UuidSerializer, createUuid} from './uuid';

type Timestamp = Brand<number, 'timestamp'>;

type UserId = Brand<Uuid, 'user_id'>;

export interface User {
    id: UserId;
    name: string;
    email: string;
}

type BoardId = Brand<Uuid, 'board_id'>;

export interface Board {
    id: BoardId;
    name: string;
    ownerId: UserId;
    deleted: boolean;
}

type TaskId = Brand<Uuid, 'task_id'>;

export interface Task {
    id: TaskId;
    authorId: UserId;
    boardId: BoardId;
    title: string;
    text: Richtext;
    meta: Meta;
    deleted: boolean;
}

export interface Meta {
    createdAt: Timestamp;
}

export interface UserRepository {
    getById(id: UserId): Promise<Crdt<User> | undefined>;
    update(id: UserId, diff: CrdtDiff<User>): Promise<Crdt<User>>;
}

export interface TaskRepository {
    getById(taskId: TaskId): Promise<Crdt<Task> | undefined>;
    getByAuthorId(authorId: TaskId): Promise<AsyncIterator<Crdt<Task>>>;
    getByBoardId(authorId: TaskId): Promise<AsyncIterator<Crdt<Task>>>;
}

export interface DataLayerTransaction {
    readonly users: UserRepository;
    readonly tasks: TaskRepository;

    optimisticLock(key: string): Promise<void>;
}

export interface DataLayer {
    transaction<T>(fn: (txn: DataLayerTransaction) => Promise<T>): Promise<T>;
}

export function getDataLayer(kv: Uint8KVStore): DataLayer {
    return {
        transaction(fn) {
            return kv.transaction(txn =>
                fn({
                    users: getUserStore(withPrefix('users/')(txn)),
                    tasks: getTaskStore(withPrefix('tasks/')(txn)),
                    optimisticLock: key =>
                        pipe(
                            txn,
                            withKeySerializer(new StringSerializer()),
                            withValueSerializer(new UuidSerializer())
                        ).put(key, createUuid()),
                })
            );
        },
    };
}

function getUserStore(txn: Uint8Transaction): UserRepository {
    const primaryIndex = pipe(
        txn,
        withKeySerializer(new UuidSerializer()),
        withValueSerializer(new CrdtSerializer<User>())
    );

    return {
        getById: id => primaryIndex.get(id),
        update: async (id, diff) => {
            const user = await primaryIndex.get(id);
            if (!user) {
                throw new Error(`user ${id} not found`);
            }

            user.apply(diff);

            await primaryIndex.put(id, user);

            return user;
        },
    };
}

function getTaskStore(txn: Uint8Transaction): TaskRepository {
    const primaryIndex = pipe(txn, withKeySerializer(new UuidSerializer()), withValueSerializer(new CrdtSerializer()));

    throw new Error('not implemented');
}
