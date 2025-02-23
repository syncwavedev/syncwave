import {z} from 'zod';
import {type BigFloat, zBigFloat} from '../../big-float.js';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid, zUuid} from '../../uuid.js';
import {
    type Doc,
    DocRepo,
    type OnDocChange,
    type Recipe,
    zDoc,
} from '../doc-repo.js';
import type {TransitionChecker} from '../transition-checker.js';
import {type BoardId, BoardRepo} from './board-repo.js';
import {type ColumnId} from './column-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

export type CardId = Brand<Uuid, 'card_id'>;

export function createCardId(): CardId {
    return createUuid() as CardId;
}

export interface Card extends Doc<[CardId]> {
    readonly id: CardId;
    readonly authorId: UserId;
    readonly boardId: BoardId;
    readonly counter: number;
    title: string;
    columnPosition: BigFloat;
    columnId: ColumnId;
}

const BOARD_ID_COUNTER_INDEX = 'boardId_counter';
const COLUMN_ID_INDEX = 'column_id';

// todo: tests should handle get by board_id with counter = undefined to check that BOARD_ID_COUNTER_INDEX is not used (it excludes counter === undefined)

export function zCard() {
    return zDoc(z.tuple([zUuid<CardId>()])).extend({
        id: zUuid<CardId>(),
        authorId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        counter: z.number(),
        title: z.string(),
        columnPosition: zBigFloat(),
        columnId: zUuid<ColumnId>(),
    });
}

export class CardRepo {
    public readonly rawRepo: DocRepo<Card>;

    constructor(
        tx: AppTransaction,
        boardRepo: BoardRepo,
        userRepo: UserRepo,
        onChange: OnDocChange<Card>
    ) {
        this.rawRepo = new DocRepo<Card>({
            tx: isolate(['d'])(tx),
            onChange,
            indexes: {
                [BOARD_ID_COUNTER_INDEX]: {
                    key: x => [x.boardId, x.counter],
                    unique: true,
                },
                [COLUMN_ID_INDEX]: {
                    key: x => [x.columnId],
                },
            },
            schema: zCard(),
            constraints: [
                {
                    name: 'card.authorId fk',
                    verify: async card => {
                        const user = await userRepo.getById(
                            card.authorId,
                            true
                        );
                        if (user === undefined) {
                            return `user not found: ${card.authorId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'card.boardId fk',
                    verify: async card => {
                        const board = await boardRepo.getById(card.boardId);
                        if (board === undefined) {
                            return `board not found: ${card.boardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    getById(id: CardId, includeDeleted: boolean) {
        return this.rawRepo.getById([id], includeDeleted);
    }

    getByBoardId(boardId: BoardId): Stream<Card> {
        return this.rawRepo.get(BOARD_ID_COUNTER_INDEX, [boardId]);
    }

    getByColumnId(columnId: ColumnId | null): Stream<Card> {
        return this.rawRepo.get(COLUMN_ID_INDEX, [columnId]);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Card>,
        checker: TransitionChecker<Card>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    create(user: Omit<Card, 'pk'>): Promise<Card> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(
        id: CardId,
        recipe: Recipe<Card>,
        includeDeleted = false
    ): Promise<Card> {
        return this.rawRepo.update([id], recipe, includeDeleted);
    }
}
