import {AsyncStream} from '../../async-stream';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store';
import {Richtext} from '../../richtext';
import {Brand} from '../../utils';
import {Uuid, createUuid} from '../../uuid';
import {Doc, DocRepo, OnDocChange, Recipe} from '../doc-repo';
import {createWriteableChecker} from '../update-checker';
import {BoardId} from './board-repo';
import {UserId} from './user-repo';

export type TaskId = Brand<Uuid, 'task_id'>;

export function createTaskId(): TaskId {
    return createUuid() as TaskId;
}

export interface Task extends Doc<TaskId> {
    readonly authorId: UserId;
    readonly boardId: BoardId;
    readonly counter: number | undefined;
    title: string;
    text: Richtext;
    deleted: boolean;
}

const BOARD_ID_COUNTER_INDEX = 'boardId_counter';
const BOARD_ID = 'boardId';

// todo: tests should handle get by board_id with counter = undefined to check that BOARD_ID_COUNTER_INDEX is not used (it excludes counter === undefined)

export class TaskRepo {
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
            updateChecker: createWriteableChecker({
                deleted: true,
                text: true,
                title: true,
            }),
        });
    }

    getById(id: TaskId): Promise<Task | undefined> {
        return this.store.getById(id);
    }

    getByBoardId(boardId: BoardId): AsyncStream<Task> {
        return this.store.get(BOARD_ID, [boardId]);
    }

    create(user: Task): Promise<void> {
        return this.store.create(user);
    }

    update(id: TaskId, recipe: Recipe<Task>): Promise<Task> {
        return this.store.update(id, recipe);
    }
}
