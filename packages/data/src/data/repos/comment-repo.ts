import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Brand} from '../../utils.js';
import {createUuid, Uuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {TaskId, TaskRepo} from './task-repo.js';
import {UserId, UserRepo} from './user-repo.js';

export type CommentId = Brand<Uuid, 'comment_id'>;

export function createCommentId(): CommentId {
    return createUuid() as CommentId;
}

export interface Comment extends Doc<[CommentId]> {
    readonly id: CommentId;
    readonly authorId: UserId;
    readonly taskId: TaskId;
    readonly text: string;
}

const TASK_ID_INDEX = 'task_id';

// todo: tests should handle get by task_id with counter = undefined to check that BOARD_ID_COUNTER_INDEX is not used (it excludes counter === undefined)

export function zComment() {
    return zDoc(z.tuple([zUuid<CommentId>()])).extend({
        id: zUuid<CommentId>(),
        authorId: zUuid<UserId>(),
        taskId: zUuid<TaskId>(),
        text: z.string(),
    });
}

export class CommentRepo {
    public readonly rawRepo: DocRepo<Comment>;

    constructor(
        tx: Uint8Transaction,
        taskRepo: TaskRepo,
        userRepo: UserRepo,
        onChange: OnDocChange<Comment>
    ) {
        this.rawRepo = new DocRepo<Comment>({
            tx: withPrefix('d/')(tx),
            onChange,
            indexes: {
                [TASK_ID_INDEX]: {
                    key: x => [x.taskId],
                },
            },
            schema: zComment(),
            constraints: [
                {
                    name: 'comment.authorId fk',
                    verify: async comment => {
                        const user = await userRepo.getById(
                            comment.authorId,
                            true
                        );
                        if (user === undefined) {
                            return `user not found: ${comment.authorId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'comment.taskId fk',
                    verify: async comment => {
                        const task = await taskRepo.getById(
                            comment.taskId,
                            true
                        );
                        if (task === undefined) {
                            return `task not found: ${comment.taskId}`;
                        }
                        return;
                    },
                },
            ],
            readonly: {
                taskId: true,
                id: true,
                text: true,
                authorId: true,
            },
        });
    }

    getById(
        id: CommentId,
        includeDeleted: boolean
    ): Promise<Comment | undefined> {
        return this.rawRepo.getById([id], includeDeleted);
    }

    getByTaskId(taskId: TaskId): Stream<Comment> {
        return this.rawRepo.get(TASK_ID_INDEX, [taskId]);
    }

    async apply(id: Uuid, diff: CrdtDiff<Comment>) {
        return await this.rawRepo.apply([id], diff);
    }

    create(user: Omit<Comment, 'pk'>): Promise<Comment> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(
        id: CommentId,
        recipe: Recipe<Comment>,
        includeDeleted = false
    ): Promise<Comment> {
        return this.rawRepo.update([id], recipe, includeDeleted);
    }
}
