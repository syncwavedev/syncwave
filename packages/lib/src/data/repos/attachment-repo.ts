import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
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
import {zObjectKey, zObjectMetadata} from '../infrastructure.js';
import type {TransitionChecker} from '../transition-checker.js';
import type {BoardId, BoardRepo} from './board-repo.js';
import {type CardId, CardRepo} from './card-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

export type AttachmentId = Brand<Uuid, 'message_id'>;

export function createAttachmentId(): AttachmentId {
    return createUuid() as AttachmentId;
}

const CARD_ID_INDEX = 'card_id';
const BOARD_ID_INDEX = 'board_id';
const AUTHOR_ID_INDEX = 'author_id';
const OBJECT_KEY_INDEX = 'object_key';

export function zAttachment() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<AttachmentId>()])),
        Type.Object({
            id: Uuid<AttachmentId>(),
            authorId: Uuid<UserId>(),
            boardId: Uuid<BoardId>(),
            cardId: Uuid<CardId>(),
            objectKey: zObjectKey(),
            metadata: zObjectMetadata(),
        }),
    ]);
}

export interface Attachment extends Static<ReturnType<typeof zAttachment>> {}

export class AttachmentRepo {
    public readonly rawRepo: DocRepo<Attachment>;

    constructor(params: {
        tx: AppTransaction;
        cardRepo: CardRepo;
        userRepo: UserRepo;
        boardRepo: BoardRepo;
        onChange: OnDocChange<Attachment>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<Attachment>({
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
                [OBJECT_KEY_INDEX]: {
                    key: x => [[x.objectKey, x.createdAt]],
                },
            },
            schema: zAttachment(),
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
            ],
        });
    }

    getById(id: AttachmentId, options?: QueryOptions) {
        return this.rawRepo.getById([id], options);
    }

    getByCardId(cardId: CardId): Stream<Attachment> {
        return this.rawRepo.get(CARD_ID_INDEX, [cardId]);
    }

    getByBoardId(cardId: BoardId): Stream<Attachment> {
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
