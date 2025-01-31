import {z} from 'zod';
import {AsyncStream} from '../../async-stream.js';
import {Cx} from '../../context.js';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
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

export class TaskRepo {
    public readonly rawRepo: DocRepo<Task>;

    constructor(cx: Cx, tx: Uint8Transaction, onChange: OnDocChange<Task>) {
        this.rawRepo = new DocRepo<Task>(cx, {
            tx: withPrefix(cx, 'd/')(tx),
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

    getById(cx: Cx, id: TaskId): Promise<Task | undefined> {
        return this.rawRepo.getById(cx, id);
    }

    getByBoardId(cx: Cx, boardId: BoardId): AsyncStream<Task> {
        return this.rawRepo.get(cx, BOARD_ID, [boardId]);
    }

    async apply(cx: Cx, id: Uuid, diff: CrdtDiff<Task>): Promise<void> {
        return await this.rawRepo.apply(
            cx,
            id,
            diff,
            createWriteableChecker({
                deleted: true,
                title: true,
            })
        );
    }

    create(cx: Cx, user: Task): Promise<Task> {
        return this.rawRepo.create(cx, user);
    }

    update(cx: Cx, id: TaskId, recipe: Recipe<Task>): Promise<Task> {
        return this.rawRepo.update(cx, id, recipe);
    }
}
