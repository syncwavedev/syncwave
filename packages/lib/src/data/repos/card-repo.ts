import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {Richtext} from '../../crdt/richtext.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
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
import {type BoardId, BoardRepo} from './board-repo.js';
import {type ColumnId} from './column-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

export function CardId() {
    return Uuid<CardId>();
}

export type CardId = Brand<Uuid, 'card_id'>;

export function createCardId(): CardId {
    return createUuid() as CardId;
}

const BOARD_ID_COUNTER_INDEX = 'boardId_counter';
const COLUMN_ID_INDEX = 'column_id';
const AUTHOR_ID_INDEX = 'author_id';
const ASSIGNEE_ID_INDEX = 'assignee_id';

// todo: tests should handle get by board_id with counter = undefined to check that BOARD_ID_COUNTER_INDEX is not used (it excludes counter === undefined)

export function Card() {
    return Type.Composite([
        Doc(Type.Tuple([Uuid<CardId>()])),
        Type.Object({
            id: Uuid<CardId>(),
            authorId: Uuid<UserId>(),
            boardId: Uuid<BoardId>(),
            counter: Type.Union([Type.Number(), Type.Null()]),
            assigneeId: Type.Optional(
                Type.Union([Uuid<UserId>(), Type.Undefined()])
            ),
            text: Richtext(),
            columnId: Uuid<ColumnId>(),
            position: Type.Number(),
        }),
    ]);
}

export interface Card extends Static<ReturnType<typeof Card>> {}

export class CardRepo {
    public readonly rawRepo: DocRepo<Card>;

    constructor(params: {
        tx: AppTransaction;
        boardRepo: BoardRepo;
        userRepo: UserRepo;
        onChange: OnDocChange<Card>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<Card>({
            tx: isolate(['d'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [BOARD_ID_COUNTER_INDEX]: {
                    key: x => [[x.boardId, x.counter]],
                    unique: true,
                },
                [COLUMN_ID_INDEX]: {
                    key: x => [[x.columnId]],
                },
                [AUTHOR_ID_INDEX]: {
                    key: x => [[x.authorId, x.createdAt]],
                },
                [ASSIGNEE_ID_INDEX]: {
                    key: x => [[x.assigneeId ?? null, x.createdAt]],
                },
            },
            schema: Card(),
            constraints: [
                {
                    name: 'card.authorId fk',
                    verify: async card => {
                        const user = await params.userRepo.getById(
                            card.authorId
                        );
                        if (user === undefined) {
                            return `author not found: ${card.authorId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'card.boardId fk',
                    verify: async card => {
                        const board = await params.boardRepo.getById(
                            card.boardId
                        );
                        if (board === undefined) {
                            return `board not found: ${card.boardId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'card.assigneeId fk',
                    verify: async card => {
                        if (!card.assigneeId) {
                            return;
                        }

                        const user = await params.userRepo.getById(
                            card.assigneeId
                        );
                        if (user === undefined) {
                            return `assignee not found: ${card.authorId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    getById(id: CardId, options?: QueryOptions) {
        return this.rawRepo.getById([id], options);
    }

    getByBoardId(
        boardId: BoardId,
        options?: QueryOptions
    ): Stream<CrdtDoc<Card>> {
        return this.rawRepo.get(BOARD_ID_COUNTER_INDEX, [boardId], options);
    }

    async getByBoardIdAndCounter(
        boardId: BoardId,
        counter: number
    ): Promise<Card | undefined> {
        return await this.rawRepo.getUnique(BOARD_ID_COUNTER_INDEX, [
            boardId,
            counter,
        ]);
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
        options?: QueryOptions
    ): Promise<Card> {
        return this.rawRepo.update([id], recipe, options);
    }
}
