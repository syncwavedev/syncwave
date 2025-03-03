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

export type MessageId = Brand<Uuid, 'message_id'>;

export function createMessageId(): MessageId {
    return createUuid() as MessageId;
}

export interface Message extends Doc<[MessageId]> {
    readonly id: MessageId;
    readonly authorId: UserId;
    readonly cardId: CardId;
    readonly text: string;
}

const TASK_ID_INDEX = 'card_id';

// todo: tests should handle get by card_id with counter = undefined to check that BOARD_ID_COUNTER_INDEX is not used (it excludes counter === undefined)

export function zMessage() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<MessageId>()])),
        Type.Object({
            id: Uuid<MessageId>(),
            authorId: Uuid<UserId>(),
            cardId: Uuid<CardId>(),
            text: Type.String(),
        }),
    ]);
}

export class MessageRepo {
    public readonly rawRepo: DocRepo<Message>;

    constructor(
        tx: AppTransaction,
        cardRepo: CardRepo,
        userRepo: UserRepo,
        onChange: OnDocChange<Message>
    ) {
        this.rawRepo = new DocRepo<Message>({
            tx: isolate(['d'])(tx),
            onChange,
            indexes: {
                [TASK_ID_INDEX]: {
                    key: x => [x.cardId],
                },
            },
            schema: zMessage(),
            constraints: [
                {
                    name: 'message.authorId fk',
                    verify: async message => {
                        const user = await userRepo.getById(
                            message.authorId,
                            true
                        );
                        if (user === undefined) {
                            return `user not found: ${message.authorId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'message.cardId fk',
                    verify: async message => {
                        const card = await cardRepo.getById(
                            message.cardId,
                            true
                        );
                        if (card === undefined) {
                            return `card not found: ${message.cardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    getById(
        id: MessageId,
        includeDeleted: boolean
    ): Promise<Message | undefined> {
        return this.rawRepo.getById([id], includeDeleted);
    }

    getByCardId(cardId: CardId): Stream<Message> {
        return this.rawRepo.get(TASK_ID_INDEX, [cardId]);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Message>,
        checker: TransitionChecker<Message>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    create(user: Omit<Message, 'pk'>): Promise<Message> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(
        id: MessageId,
        recipe: Recipe<Message>,
        includeDeleted = false
    ): Promise<Message> {
        return this.rawRepo.update([id], recipe, includeDeleted);
    }
}
