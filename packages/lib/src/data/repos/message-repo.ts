import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {zRichtext} from '../../crdt/richtext.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {getNow} from '../../timestamp.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {
    DocRepo,
    type OnDocChange,
    type QueryOptions,
    type Recipe,
    zDoc,
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

export function zBaseMessagePayload<TType extends string>(type: TType) {
    return Type.Object({
        type: Type.Literal(type),
    });
}

export interface BaseMessagePayload<TType extends string>
    extends Static<ReturnType<typeof zBaseMessagePayload<TType>>> {}

export function zTextMessagePayload() {
    return Type.Composite([
        zBaseMessagePayload('text'),
        Type.Object({
            text: zRichtext(),
            attachmentIds: Type.Array(Uuid<AttachmentId>()),
            replyToId: Type.Optional(Uuid<MessageId>()),
        }),
    ]);
}

export interface TextMessagePayload
    extends Static<ReturnType<typeof zTextMessagePayload>> {}

export function zMessagePayload() {
    return Type.Union([zTextMessagePayload()]);
}

export type MessagePayload = Static<ReturnType<typeof zMessagePayload>>;

export function zMessage() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<MessageId>()])),
        Type.Object({
            id: Uuid<MessageId>(),
            authorId: Uuid<UserId>(),
            // message target + foreign keys to target parents
            target: Type.Literal('card'),
            cardId: Uuid<CardId>(),
            columnId: Uuid<ColumnId>(),
            boardId: Uuid<BoardId>(),
            payload: zMessagePayload(),
        }),
    ]);
}

export interface Message extends Static<ReturnType<typeof zMessage>> {}

const CARD_ID_INDEX = 'card_id';
const COLUMN_ID_INDEX = 'column_id';
const REPLY_TO_ID_INDEX = 'reply_to_id';
const BOARD_ID_INDEX = 'board_id';
const AUTHOR_ID_INDEX = 'author_id';

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
                    key: x => [x.cardId, x.createdAt],
                },
                [BOARD_ID_INDEX]: {
                    key: x => [x.cardId, x.createdAt],
                },
                [AUTHOR_ID_INDEX]: {
                    key: x => [x.authorId, x.createdAt],
                },
                [COLUMN_ID_INDEX]: {
                    key: x => [x.columnId, x.createdAt],
                },
                [REPLY_TO_ID_INDEX]: {
                    key: x => [x.payload.replyToId ?? null, x.createdAt],
                },
            },
            schema: zMessage(),
            constraints: [
                {
                    name: 'message.authorId fk',
                    verify: async message => {
                        const user = await params.userRepo.getById(
                            message.authorId,
                            {includeDeleted: true}
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
                            {includeDeleted: true}
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
                            message.columnId,
                            {includeDeleted: true}
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
                            message.boardId,
                            {includeDeleted: true}
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
                        if (!message.payload.replyToId) {
                            return;
                        }
                        const replyTo = await this.getById(
                            message.payload.replyToId,
                            {includeDeleted: true}
                        );
                        if (replyTo === undefined) {
                            return `replyTo not found: ${message.payload.replyToId}`;
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
        options?: QueryOptions
    ): Promise<Message> {
        return this.rawRepo.update([id], recipe, options);
    }
}
