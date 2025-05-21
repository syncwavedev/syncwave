import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {ObjectKey, ObjectMetadata} from '../infrastructure.js';
import type {TransitionChecker} from '../transition-checker.js';
import {
    type CrdtDoc,
    CrdtRepo,
    type OnCrdtChange,
    type QueryOptions,
    type Recipe,
} from './base/crdt-repo.js';
import {Doc} from './base/doc.js';
import type {BoardId, BoardRepo} from './board-repo.js';
import {type CardId, CardRepo} from './card-repo.js';
import type {ColumnId} from './column-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

export type AttachmentId = Brand<Uuid, 'message_id'>;

export function createAttachmentId(): AttachmentId {
    return createUuid() as AttachmentId;
}

const CARD_ID_INDEX = 'card_id';
const COLUMN_ID_INDEX = 'column_id';
const BOARD_ID_INDEX = 'board_id';
const AUTHOR_ID_INDEX = 'author_id';
const OBJECT_KEY_INDEX = 'object_key';

export function Attachment() {
    return Type.Composite([
        Doc(Type.Tuple([Uuid<AttachmentId>()])),
        Type.Object({
            id: Uuid<AttachmentId>(),
            authorId: Uuid<UserId>(),
            boardId: Uuid<BoardId>(),
            columnId: Uuid<ColumnId>(),
            cardId: Uuid<CardId>(),
            objectKey: ObjectKey(),
            metadata: ObjectMetadata(),
        }),
    ]);
}

export interface Attachment extends Static<ReturnType<typeof Attachment>> {}

export class AttachmentRepo {
    public readonly rawRepo: CrdtRepo<Attachment>;

    constructor(params: {
        tx: AppTransaction;
        cardRepo: CardRepo;
        userRepo: UserRepo;
        boardRepo: BoardRepo;
        onChange: OnCrdtChange<Attachment>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new CrdtRepo<Attachment>({
            tx: isolate(['d'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [CARD_ID_INDEX]: {
                    key: x => [[x.cardId, x.createdAt]],
                },
                [COLUMN_ID_INDEX]: {
                    key: x => [[x.columnId, x.createdAt]],
                },
                [BOARD_ID_INDEX]: {
                    key: x => [[x.boardId, x.createdAt]],
                },
                [AUTHOR_ID_INDEX]: {
                    key: x => [[x.authorId, x.createdAt]],
                },
                [OBJECT_KEY_INDEX]: {
                    key: x => [[x.objectKey, x.createdAt]],
                },
            },
            schema: Attachment(),
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
            ],
        });
    }

    getById(id: AttachmentId, options?: QueryOptions) {
        return this.rawRepo.getById([id], options);
    }

    getByCardId(cardId: CardId): Stream<CrdtDoc<Attachment>> {
        return this.rawRepo.get(CARD_ID_INDEX, [cardId]);
    }

    getByBoardId(cardId: BoardId): Stream<CrdtDoc<Attachment>> {
        return this.rawRepo.get(CARD_ID_INDEX, [cardId]);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Attachment>,
        checker: TransitionChecker<Attachment>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    create(user: Omit<Attachment, 'pk'>): Promise<Attachment> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(
        id: AttachmentId,
        recipe: Recipe<Attachment>,
        options?: QueryOptions
    ): Promise<Attachment> {
        return this.rawRepo.update([id], recipe, options);
    }
}
