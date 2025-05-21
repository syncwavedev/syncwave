import {type Static, Type} from '@sinclair/typebox';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {type QueryOptions} from './base/crdt-repo.js';
import {DocRepo, type OnDocChange} from './base/doc-repo.js';
import {Doc} from './base/doc.js';
import {type BoardId, BoardRepo} from './board-repo.js';
import {CardId, type CardRepo} from './card-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

const BOARD_ID_INDEX = 'board_id_v2';
const CARD_ID_INDEX = 'card_id';
const USER_ID_INDEX = 'user_id';

export function CardCursor() {
    return Type.Composite([
        Doc(Type.Tuple([Uuid<UserId>(), CardId()])),
        Type.Object({
            userId: Uuid<UserId>(),
            cardId: Uuid<CardId>(),
            boardId: Uuid<BoardId>(),
            timestamp: Type.Number(),
        }),
    ]);
}

export interface CardCursor extends Static<ReturnType<typeof CardCursor>> {}

export class CardCursorRepo {
    public readonly rawRepo: DocRepo<CardCursor>;

    constructor(params: {
        tx: AppTransaction;
        boardRepo: BoardRepo;
        userRepo: UserRepo;
        cardRepo: CardRepo;
        onChange: OnDocChange<CardCursor>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<CardCursor>({
            tx: isolate(['repo'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [BOARD_ID_INDEX]: {
                    key: x => [[x.boardId]],
                },
                [CARD_ID_INDEX]: {
                    key: x => [[x.cardId]],
                },
                [USER_ID_INDEX]: {
                    key: x => [[x.userId]],
                },
            },
            schema: CardCursor(),
            constraints: [
                {
                    name: 'timelineCursor.userId fk',
                    verify: async timelineCursor => {
                        const user = await params.userRepo.getById(
                            timelineCursor.userId
                        );
                        if (user === undefined) {
                            return `author not found: ${timelineCursor.userId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'timelineCursor.boardId fk',
                    verify: async timelineCursor => {
                        const board = await params.boardRepo.getById(
                            timelineCursor.boardId
                        );
                        if (board === undefined) {
                            return `board not found: ${timelineCursor.boardId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'timelineCursor.cardId fk',
                    verify: async timelineCursor => {
                        const board = await params.cardRepo.getById(
                            timelineCursor.cardId
                        );
                        if (board === undefined) {
                            return `board not found: ${timelineCursor.cardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    getById(userId: UserId, cardId: CardId, options?: QueryOptions) {
        return this.rawRepo.getById([userId, cardId], options);
    }

    getByBoardId(boardId: BoardId, options?: QueryOptions): Stream<CardCursor> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId], options);
    }

    getByCardId(cardId: CardId | null): Stream<CardCursor> {
        return this.rawRepo.get(CARD_ID_INDEX, [cardId]);
    }

    create(cursor: Omit<CardCursor, 'pk'>): Promise<CardCursor> {
        return this.rawRepo.create({
            pk: [cursor.userId, cursor.cardId],
            ...cursor,
        });
    }

    put(cursor: Omit<CardCursor, 'pk'>): Promise<CardCursor> {
        return this.rawRepo.put({
            pk: [cursor.userId, cursor.cardId],
            ...cursor,
        });
    }
}
