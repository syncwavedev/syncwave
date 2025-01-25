import {z} from 'zod';
import {AsyncStream} from '../../async-stream.js';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {
    Doc,
    DocRepo,
    OnDocChange,
    Recipe,
    SyncTarget,
    zDoc,
} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';
import {BoardId} from './board-repo.js';
import {UserId} from './user-repo.js';

export type TaskId = Uuid & {__task_id: true | undefined};

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

export function zTask() {
    return zDoc<TaskId>().extend({
        authorId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        counter: z.number().nullable(),
        title: z.string(),
        deleted: z.boolean(),
    });
}

export class TaskRepo implements SyncTarget<Task> {
    public readonly rawRepo: DocRepo<Task>;

    constructor(tx: Uint8Transaction, onChange: OnDocChange<Task>) {
        this.rawRepo = new DocRepo<Task>({
            tx: withPrefix('d/')(tx),
            onChange,
            indexes: {
                [BOARD_ID_COUNTER_INDEX]: {
                    key: x => [x.boardId, x.counter],
                    unique: true,
                    include: x => x.counter !== undefined,
                },
                [BOARD_ID]: x => [x.boardId, x.counter],
            },
            schema: zTask(),
        });
    }

    async apply(id: Uuid, diff: CrdtDiff<Task>): Promise<void> {
        return await this.rawRepo.apply(
            id,
            diff,
            createWriteableChecker({
                deleted: true,
                title: true,
            })
        );
    }

    getById(id: TaskId): Promise<Task | undefined> {
        return this.rawRepo.getById(id);
    }

    getByBoardId(boardId: BoardId): AsyncStream<Task> {
        return this.rawRepo.get(BOARD_ID, [boardId]);
    }

    create(user: Task): Promise<Task> {
        return this.rawRepo.create(user);
    }

    update(id: TaskId, recipe: Recipe<Task>): Promise<Task> {
        return this.rawRepo.update(id, recipe);
    }
}
