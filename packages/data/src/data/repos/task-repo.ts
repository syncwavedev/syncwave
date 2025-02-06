import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {UserId, UserRepo} from './user-repo.js';

export type TaskId = Uuid & {__task_id: true | undefined};

export function createTaskId(): TaskId {
    return createUuid() as TaskId;
}

export interface Task extends Doc<[TaskId]> {
    readonly id: TaskId;
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
    return zDoc(z.tuple([zUuid<TaskId>()])).extend({
        id: zUuid<TaskId>(),
        authorId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        counter: z.number().nullable(),
        title: z.string(),
        deleted: z.boolean(),
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
                    include: x => x.counter !== undefined,
                },
                [BOARD_ID]: x => [x.boardId, x.counter],
            },
            schema: zTask(),
            constraints: [
                {
                    name: 'task.authorId fk',
                    verify: async task => {
                        const user = await userRepo.getById(task.authorId);
                        return user !== undefined;
                    },
                },
                {
                    name: 'task.boardId fk',
                    verify: async task => {
                        const board = await boardRepo.getById(task.boardId);
                        return board !== undefined;
                    },
                },
            ],
        });
    }

    getById(id: TaskId): Promise<Task | undefined> {
        return this.rawRepo.getById([id]);
    }

    getByBoardId(boardId: BoardId): Stream<Task> {
        return this.rawRepo.get(BOARD_ID, [boardId]);
    }

    async apply(id: Uuid, diff: CrdtDiff<Task>): Promise<void> {
        return await this.rawRepo.apply(
            [id],
            diff,
            createWriteableChecker({
                deleted: true,
                title: true,
            })
        );
    }

    create(user: Omit<Task, 'pk'>): Promise<Task> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(id: TaskId, recipe: Recipe<Task>): Promise<Task> {
        return this.rawRepo.update([id], recipe);
    }
}
