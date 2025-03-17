import {Type} from '@sinclair/typebox';
import {type BigFloat, toBigFloat, zBigFloat} from '../../big-float.js';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {type Brand, unreachable} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import {
    type CrdtDoc,
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

export interface ColumnV4 extends Doc<[ColumnId]> {
    readonly id: ColumnId;
    readonly version: '4';
    readonly authorId: UserId;
    readonly boardId: BoardId;
    name: string;
    deleted: boolean;
    boardPosition: BigFloat;
}

export interface Column extends ColumnV4 {}
type StoredColumn = ColumnV1 | ColumnV2 | ColumnV3 | ColumnV4;

const BOARD_ID_INDEX = 'boardId';
const AUTHOR_ID_INDEX = 'author_id';

export function zColumn() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<ColumnId>()])),
        Type.Object({
            id: Uuid<ColumnId>(),
            authorId: Uuid<UserId>(),
            boardId: Uuid<BoardId>(),
            name: Type.String(),
            version: Type.Literal('4'),
            boardPosition: zBigFloat(),
        }),
    ]);
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
                [BOARD_ID_INDEX]: x => [x.boardId],
                [AUTHOR_ID_INDEX]: x => [x.authorId, x.createdAt],
            },
            schema: zColumn(),
            upgrade: function upgradeColumn(column: StoredColumn) {
                if ('version' in column) {
                    if (typeof column.version === 'number') {
                        (column as any).version = '3';

                        upgradeColumn(column);
                    } else if (typeof column.version === 'string') {
                        if (column.version === '3') {
                            (column as any).version = '4';
                            (column as any).name = column.title;

                            upgradeColumn(column);
                        } else if (column.version === '4') {
                            // latest version
                        }
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

    getByBoardId(
        boardId: BoardId,
        includeDeleted = false
    ): Stream<CrdtDoc<Column>> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId], includeDeleted);
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
