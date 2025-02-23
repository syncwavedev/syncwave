import {z} from 'zod';
import {type BigFloat, toBigFloat, zBigFloat} from '../../big-float.js';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {type Brand, unreachable} from '../../utils.js';
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
import {type UserId, UserRepo} from './user-repo.js';

export type ColumnId = Brand<Uuid, 'column_id'>;

export function createColumnId(): ColumnId {
    return createUuid() as ColumnId;
}

interface ColumnV1 extends Doc<[ColumnId]> {
    readonly id: ColumnId;
    readonly authorId: UserId;
    readonly boardId: BoardId;
    title: string;
    deleted: boolean;
}

export interface ColumnV2 extends Doc<[ColumnId]> {
    readonly id: ColumnId;
    readonly version: 2;
    readonly authorId: UserId;
    readonly boardId: BoardId;
    title: string;
    deleted: boolean;
    boardPosition: BigFloat;
}

export interface ColumnV3 extends Doc<[ColumnId]> {
    readonly id: ColumnId;
    readonly version: '3';
    readonly authorId: UserId;
    readonly boardId: BoardId;
    title: string;
    deleted: boolean;
    boardPosition: BigFloat;
}

export type Column = ColumnV3;
type StoredColumn = ColumnV1 | ColumnV2 | ColumnV3;

const BOARD_ID = 'boardId';

export function zColumn() {
    return zDoc(z.tuple([zUuid<ColumnId>()])).extend({
        id: zUuid<ColumnId>(),
        authorId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        title: z.string(),
        version: z.literal('3'),
        boardPosition: zBigFloat(),
    });
}

export class ColumnRepo {
    public readonly rawRepo: DocRepo<Column>;

    constructor(
        tx: AppTransaction,
        boardRepo: BoardRepo,
        userRepo: UserRepo,
        onChange: OnDocChange<Column>
    ) {
        this.rawRepo = new DocRepo<Column>({
            tx: isolate(['d'])(tx),
            onChange,
            indexes: {
                [BOARD_ID]: x => [x.boardId],
            },
            schema: zColumn(),
            upgrade: function upgradeColumn(column: StoredColumn) {
                if ('version' in column) {
                    if (typeof column.version === 'number') {
                        (column as any).version = '3';

                        upgradeColumn(column);
                    } else if (typeof column.version === 'string') {
                        // latest version
                    } else {
                        // assertNever(column);
                        unreachable();
                    }
                } else {
                    (column as any).version = 2;
                    (column as any).boardPosition = toBigFloat(Math.random());

                    upgradeColumn(column);
                }
            },
            constraints: [
                {
                    name: 'column.authorId fk',
                    verify: async column => {
                        const user = await userRepo.getById(
                            column.authorId,
                            true
                        );
                        if (user === undefined) {
                            return `user not found: ${column.authorId}`;
                        }

                        return;
                    },
                },
                {
                    name: 'column.boardId fk',
                    verify: async column => {
                        const board = await boardRepo.getById(column.boardId);
                        if (board === undefined) {
                            return `board not found: ${column.boardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    async getById(id: ColumnId, includeDeleted: boolean) {
        return await this.rawRepo.getById([id], includeDeleted);
    }

    getByBoardId(boardId: BoardId): Stream<Column> {
        return this.rawRepo.get(BOARD_ID, [boardId]);
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Column>,
        checker: TransitionChecker<Column>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    create(user: Omit<Column, 'pk'>): Promise<Column> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(
        id: ColumnId,
        recipe: Recipe<Column>,
        includeDeleted = false
    ): Promise<Column> {
        return this.rawRepo.update([id], recipe, includeDeleted);
    }
}
