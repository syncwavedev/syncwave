import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {Richtext} from '../../crdt/richtext.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {getNow, Timestamp} from '../../timestamp.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {
    type CrdtDoc,
    Doc,
    DocRepo,
    type OnDocChange,
    type QueryOptions,
    type Recipe,
} from '../doc-repo.js';
import type {TransitionChecker} from '../transition-checker.js';
import type {AttachmentId} from './attachment-repo.js';
import type {BoardId, BoardRepo} from './board-repo.js';
import {type CardId, CardRepo} from './card-repo.js';
import type {ColumnId, ColumnRepo} from './column-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

export type MessageId = Brand<Uuid, 'message_id'>;

export function createMessageId(): MessageId {
    return createUuid() as MessageId;
}

export function BaseMessagePayload<TType extends string>(type: TType) {
    return Type.Object({
        type: Type.Literal(type),
    });
}

export interface BaseMessagePayload<TType extends string>
    extends Static<ReturnType<typeof BaseMessagePayload<TType>>> {}

export function TextMessagePayload() {
    return Type.Composite([
        BaseMessagePayload('text'),
        Type.Object({
            text: Richtext(),
        }),
    ]);
}

export interface TextMessagePayload
    extends Static<ReturnType<typeof TextMessagePayload>> {}

export function CardCreatedMessagePayload() {
    return Type.Composite([
        BaseMessagePayload('card_created'),
        Type.Object({
            cardId: Uuid<CardId>(),
            cardCreatedAt: Timestamp(),
        }),
    ]);
}

export interface CardCreatedMessagePayload
    extends Static<ReturnType<typeof CardCreatedMessagePayload>> {}

export function CardDeletedMessagePayload() {
    return Type.Composite([
        BaseMessagePayload('card_deleted'),
        Type.Object({
            cardId: Uuid<CardId>(),
            cardDeletedAt: Timestamp(),
        }),
    ]);
}

export interface CardDeletedMessagePayload
    extends Static<ReturnType<typeof CardDeletedMessagePayload>> {}

export function CardColumnChangedMessagePayload() {
    return Type.Composite([
        BaseMessagePayload('card_column_changed'),
        Type.Object({
            cardId: Uuid<CardId>(),
            cardColumnChangedAt: Timestamp(),
            fromColumnId: Uuid<ColumnId>(),
            toColumnId: Uuid<ColumnId>(),
            fromColumnName: Type.String(),
            toColumnName: Type.String(),
        }),
    ]);
}

export interface CardColumnChangedMessagePayload
    extends Static<ReturnType<typeof CardColumnChangedMessagePayload>> {}

export function MessagePayload() {
    return Type.Union([
        TextMessagePayload(),
        CardCreatedMessagePayload(),
        CardDeletedMessagePayload(),
        CardColumnChangedMessagePayload(),
    ]);
}

export type MessagePayload = Static<ReturnType<typeof MessagePayload>>;

export function Message() {
    return Type.Composite([
        Doc(Type.Tuple([Uuid<MessageId>()])),
        Type.Object({
            id: Uuid<MessageId>(),
            authorId: Uuid<UserId>(),
            // message target + foreign keys to target parents
            target: Type.Literal('card'),
            cardId: Uuid<CardId>(),
            columnId: Uuid<ColumnId>(),
            boardId: Uuid<BoardId>(),
            payload: MessagePayload(),
            attachmentIds: Type.Array(Uuid<AttachmentId>()),
            replyToId: Type.Union([Uuid<MessageId>(), Type.Undefined()]),
        }),
    ]);
}

export interface Message extends Static<ReturnType<typeof Message>> {}

const CARD_ID_INDEX = 'card_id';
const COLUMN_ID_INDEX = 'column_id';
const REPLY_TO_ID_INDEX = 'reply_to_id';
const BOARD_ID_INDEX = 'board_id';
const AUTHOR_ID_INDEX = 'author_id';
const ATTACHMENT_ID_INDEX = 'attachment_id';

export class MessageRepo {
    public readonly rawRepo: DocRepo<Message>;

    constructor(params: {
        tx: AppTransaction;
        cardRepo: CardRepo;
        columnRepo: ColumnRepo;
        boardRepo: BoardRepo;
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
                    key: x => [[x.cardId, x.createdAt]],
                },
                [BOARD_ID_INDEX]: {
                    key: x => [[x.boardId, x.createdAt]],
                },
                [AUTHOR_ID_INDEX]: {
                    key: x => [[x.authorId, x.createdAt]],
                },
                [COLUMN_ID_INDEX]: {
                    key: x => [[x.columnId, x.createdAt]],
                },
                [REPLY_TO_ID_INDEX]: {
                    key: x => [[x.replyToId ?? null, x.createdAt]],
                },
                [ATTACHMENT_ID_INDEX]: {
                    key: x =>
                        x.attachmentIds.map(attachmentId => [
                            attachmentId,
                            x.createdAt,
                        ]),
                },
            },
            schema: Message(),
            constraints: [
                {
                    name: 'message.authorId fk',
                    verify: async message => {
                        const user = await params.userRepo.getById(
                            message.authorId
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
                            message.cardId
                        );
                        if (card === undefined) {
                            return `card not found: ${message.cardId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'message.columnId fk',
                    verify: async message => {
                        const column = await params.columnRepo.getById(
                            message.columnId
                        );
                        if (column === undefined) {
                            return `column not found: ${message.columnId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'message.boardId fk',
                    verify: async message => {
                        const board = await params.boardRepo.getById(
                            message.boardId
                        );
                        if (board === undefined) {
                            return `board not found: ${message.boardId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'message.payload.replyToId fk',
                    verify: async message => {
                        if (!message.replyToId) {
                            return;
                        }
                        const replyTo = await this.getById(message.replyToId);
                        if (replyTo === undefined) {
                            return `replyTo not found: ${message.replyToId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    getById(id: MessageId, options?: QueryOptions) {
        return this.rawRepo.getById([id], options);
    }

    getByCardId(cardId: CardId): Stream<CrdtDoc<Message>> {
        return this.rawRepo.get(CARD_ID_INDEX, [cardId]);
    }

    getByBoardId(boardId: BoardId): Stream<CrdtDoc<Message>> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId]);
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
        options?: QueryOptions
    ): Promise<Message> {
        return this.rawRepo.update([id], recipe, options);
    }
}
