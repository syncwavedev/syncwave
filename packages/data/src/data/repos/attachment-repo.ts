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
import {
    type ObjectKey,
    type ObjectMetadata,
    zObjectKey,
    zObjectMetadata,
} from '../infrastructure.js';
import type {TransitionChecker} from '../transition-checker.js';
import type {BoardId, BoardRepo} from './board-repo.js';
import {type CardId, CardRepo} from './card-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

export type AttachmentId = Brand<Uuid, 'message_id'>;

export function createAttachmentId(): AttachmentId {
    return createUuid() as AttachmentId;
}

export interface Attachment extends Doc<[AttachmentId]> {
    readonly id: AttachmentId;
    readonly authorId: UserId;
    readonly boardId: BoardId;
    readonly cardId: CardId;
    readonly metadata: ObjectMetadata;
    readonly objectKey: ObjectKey;
}

const CARD_ID_INDEX = 'card_id';
const BOARD_ID_INDEX = 'board_id';

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

export class AttachmentRepo {
    public readonly rawRepo: DocRepo<Attachment>;

    constructor(
        tx: AppTransaction,
        cardRepo: CardRepo,
        userRepo: UserRepo,
        boardRepo: BoardRepo,
        onChange: OnDocChange<Attachment>
    ) {
        this.rawRepo = new DocRepo<Attachment>({
            tx: isolate(['d'])(tx),
            onChange,
            indexes: {
                [CARD_ID_INDEX]: {
                    key: x => [x.cardId],
                },
                [BOARD_ID_INDEX]: {
                    key: x => [x.boardId],
                },
            },
            schema: zAttachment(),
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
                {
                    name: 'message.boardId fk',
                    verify: async message => {
                        const board = await boardRepo.getById(
                            message.boardId,
                            true
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

    getById(id: AttachmentId, includeDeleted: boolean) {
        return this.rawRepo.getById([id], includeDeleted);
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
        includeDeleted = false
    ): Promise<Attachment> {
        return this.rawRepo.update([id], recipe, includeDeleted);
    }
}
