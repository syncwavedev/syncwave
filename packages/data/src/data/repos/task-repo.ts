import {z} from 'zod';
import {BigFloat, zBigFloat} from '../../big-float.js';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Brand} from '../../utils.js';
import {createUuid, Uuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {ColumnId} from './column-repo.js';
import {UserId, UserRepo} from './user-repo.js';

export type TaskId = Brand<Uuid, 'task_id'>;

export function createTaskId(): TaskId {
    return createUuid() as TaskId;
}

export interface Task extends Doc<[TaskId]> {
    readonly id: TaskId;
    readonly authorId: UserId;
    readonly boardId: BoardId;
    readonly counter: number;
    title: string;
    columnPosition: BigFloat;
    columnId: ColumnId;
}

const BOARD_ID_COUNTER_INDEX = 'boardId_counter';
const COLUMN_ID_INDEX = 'column_id';

// todo: tests should handle get by board_id with counter = undefined to check that BOARD_ID_COUNTER_INDEX is not used (it excludes counter === undefined)

export function zTask() {
    return zDoc(z.tuple([zUuid<TaskId>()])).extend({
        id: zUuid<TaskId>(),
        authorId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        counter: z.number(),
        title: z.string(),
        columnPosition: zBigFloat(),
        columnId: zUuid<ColumnId>(),
    });
}

export class TaskRepo {
    public readonly rawRepo: DocRepo<Task>;

    constructor(
        tx: Uint8Transaction,
        boardRepo: BoardRepo,
        userRepo: UserRepo,
        onChange: OnDocChange<Task>
    ) {
        this.rawRepo = new DocRepo<Task>({
            tx: withPrefix('d/')(tx),
            onChange,
            indexes: {
                [BOARD_ID_COUNTER_INDEX]: {
                    key: x => [x.boardId, x.counter],
                    unique: true,
                },
                [COLUMN_ID_INDEX]: {
                    key: x => [x.columnId],
                },
            },
            schema: zTask(),
            constraints: [
                {
                    name: 'task.authorId fk',
                    verify: async task => {
                        const user = await userRepo.getById(
                            task.authorId,
                            true
                        );
                        if (user === undefined) {
                            return `user not found: ${task.authorId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'task.boardId fk',
                    verify: async task => {
                        const board = await boardRepo.getById(task.boardId);
                        if (board === undefined) {
                            return `board not found: ${task.boardId}`;
                        }
                        return;
                    },
                },
            ],
            readonly: {
                boardId: true,
                counter: true,
                id: true,
                title: false,
                authorId: true,
                columnPosition: false,
                columnId: false,
            },
        });
    }

    getById(id: TaskId, includeDeleted: boolean) {
        return this.rawRepo.getById([id], includeDeleted);
    }

    getByBoardId(boardId: BoardId): Stream<Task> {
        return this.rawRepo.get(BOARD_ID_COUNTER_INDEX, [boardId]);
    }

    getByColumnId(columnId: ColumnId | null): Stream<Task> {
        return this.rawRepo.get(COLUMN_ID_INDEX, [columnId]);
    }

    async apply(id: Uuid, diff: CrdtDiff<Task>) {
        return await this.rawRepo.apply([id], diff);
    }

    create(user: Omit<Task, 'pk'>): Promise<Task> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(
        id: TaskId,
        recipe: Recipe<Task>,
        includeDeleted = false
    ): Promise<Task> {
        return this.rawRepo.update([id], recipe, includeDeleted);
    }
}
