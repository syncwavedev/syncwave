import {Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type Richtext, zRichtext} from '../../crdt/richtext.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {getNow} from '../../timestamp.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {
    type Doc,
    DocRepo,
    type OnDocChange,
    type Recipe,
    zDoc,
} from '../doc-repo.js';
import type {TransitionChecker} from '../transition-checker.js';
import type {AttachmentId} from './attachment-repo.js';
import type {BoardId} from './board-repo.js';
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
    readonly boardId: BoardId;
    readonly text: Richtext;
    readonly attachmentIds: AttachmentId[];
    readonly replyToId?: MessageId;
}

const CARD_ID_INDEX = 'card_id';
const BOARD_ID_INDEX = 'board_id';
const AUTHOR_ID_INDEX = 'author_id';

export function zMessage() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<MessageId>()])),
        Type.Object({
            id: Uuid<MessageId>(),
            authorId: Uuid<UserId>(),
            cardId: Uuid<CardId>(),
            boardId: Uuid<BoardId>(),
            attachmentIds: Type.Array(Uuid<AttachmentId>()),
            text: zRichtext(),
            replyToId: Type.Optional(Uuid<MessageId>()),
        }),
    ]);
}

export class MessageRepo {
    public readonly rawRepo: DocRepo<Message>;

    constructor(params: {
        tx: AppTransaction;
        cardRepo: CardRepo;
        userRepo: UserRepo;
        onChange: OnDocChange<Message>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<Message>({
            tx: isolate(['d'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [CARD_ID_INDEX]: {
                    key: x => [x.cardId, x.createdAt],
                },
                [BOARD_ID_INDEX]: {
                    key: x => [x.cardId, x.createdAt],
                },
                [AUTHOR_ID_INDEX]: {
                    key: x => [x.authorId, x.createdAt],
                },
            },
            schema: zMessage(),
            constraints: [
                {
                    name: 'message.authorId fk',
                    verify: async message => {
                        const user = await params.userRepo.getById(
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
                        const card = await params.cardRepo.getById(
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

    getById(id: MessageId, includeDeleted: boolean) {
        return this.rawRepo.getById([id], includeDeleted);
    }

    getByCardId(cardId: CardId): Stream<Message> {
        return this.rawRepo.get(CARD_ID_INDEX, [cardId]);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Message>,
        checker: TransitionChecker<Message>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    create(message: Omit<Message, 'pk'>): Promise<Message> {
        return this.rawRepo.create({
            pk: [message.id],
            ...message,
            createdAt: getNow(),
            updatedAt: getNow(),
        });
    }

    update(
        id: MessageId,
        recipe: Recipe<Message>,
        includeDeleted = false
    ): Promise<Message> {
        return this.rawRepo.update([id], recipe, includeDeleted);
    }
}
