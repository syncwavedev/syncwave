import {z} from 'zod';
import {AsyncStream} from '../../async-stream.js';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {zTimestamp} from '../../timestamp.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, SyncTarget} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';
import {BoardId} from './board-repo.js';
import {UserId} from './user-repo.js';

export type TaskId = Brand<Uuid, 'task_id'>;

export function createTaskId(): TaskId {
    return createUuid() as TaskId;
}

export interface Task extends Doc<TaskId> {
    readonly authorId: UserId;
    readonly boardId: BoardId;
    readonly counter: number | null;
    title: string;
    deleted: boolean;
}

const BOARD_ID_COUNTER_INDEX = 'boardId_counter';
const BOARD_ID = 'boardId';

// todo: tests should handle get by board_id with counter = undefined to check that BOARD_ID_COUNTER_INDEX is not used (it excludes counter === undefined)

export class TaskRepo implements SyncTarget<Task> {
    private readonly store: DocRepo<Task>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<Task>) {
        this.store = new DocRepo<Task>({
            txn: withPrefix('d/')(txn),
            onChange,
            indexes: {
                [BOARD_ID_COUNTER_INDEX]: {
                    key: x => [x.boardId, x.counter],
                    unique: true,
                    include: x => x.counter !== undefined,
                },
                [BOARD_ID]: x => [x.boardId, x.counter],
            },
            schema: z.object({
                id: zUuid<TaskId>(),
                createdAt: zTimestamp(),
                updatedAt: zTimestamp(),
                authorId: zUuid<UserId>(),
                boardId: zUuid<BoardId>(),
                counter: z.number().nullable(),
                title: z.string(),
                deleted: z.boolean(),
            }),
        });
    }

    async apply(id: Uuid, diff: CrdtDiff<Task>): Promise<void> {
        return await this.store.apply(
            id,
            diff,
            createWriteableChecker({
                deleted: true,
                title: true,
            })
        );
    }

    getById(id: TaskId): Promise<Task | undefined> {
        return this.store.getById(id);
    }

    getByBoardId(boardId: BoardId): AsyncStream<Task> {
        return this.store.get(BOARD_ID, [boardId]);
    }

    create(user: Task): Promise<Task> {
        return this.store.create(user);
    }

    update(id: TaskId, recipe: Recipe<Task>): Promise<Task> {
        return this.store.update(id, recipe);
    }
}
