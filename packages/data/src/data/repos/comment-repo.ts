import {Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import {
    type Doc,
    DocRepo,
    type OnDocChange,
    type Recipe,
    zDoc,
} from '../doc-repo.js';
import type {TransitionChecker} from '../transition-checker.js';
import {type CardId, CardRepo} from './card-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

export type CommentId = Brand<Uuid, 'comment_id'>;

export function createCommentId(): CommentId {
    return createUuid() as CommentId;
}

export interface Comment extends Doc<[CommentId]> {
    readonly id: CommentId;
    readonly authorId: UserId;
    readonly cardId: CardId;
    readonly text: string;
}

const TASK_ID_INDEX = 'card_id';

// todo: tests should handle get by card_id with counter = undefined to check that BOARD_ID_COUNTER_INDEX is not used (it excludes counter === undefined)

export function zComment() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<CommentId>()])),
        Type.Object({
            id: Uuid<CommentId>(),
            authorId: Uuid<UserId>(),
            cardId: Uuid<CardId>(),
            text: Type.String(),
        }),
    ]);
}

export class CommentRepo {
    public readonly rawRepo: DocRepo<Comment>;

    constructor(
        tx: AppTransaction,
        cardRepo: CardRepo,
        userRepo: UserRepo,
        onChange: OnDocChange<Comment>
    ) {
        this.rawRepo = new DocRepo<Comment>({
            tx: isolate(['d'])(tx),
            onChange,
            indexes: {
                [TASK_ID_INDEX]: {
                    key: x => [x.cardId],
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
                    name: 'comment.cardId fk',
                    verify: async comment => {
                        const card = await cardRepo.getById(
                            comment.cardId,
                            true
                        );
                        if (card === undefined) {
                            return `card not found: ${comment.cardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    getById(
        id: CommentId,
        includeDeleted: boolean
    ): Promise<Comment | undefined> {
        return this.rawRepo.getById([id], includeDeleted);
    }

    getByCardId(cardId: CardId): Stream<Comment> {
        return this.rawRepo.get(TASK_ID_INDEX, [cardId]);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Comment>,
        checker: TransitionChecker<Comment>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
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
