import {z} from 'zod';
import {BigFloat, toBigFloat, zBigFloat} from '../../big-float.js';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Brand, unreachable} from '../../utils.js';
import {createUuid, Uuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {UserId, UserRepo} from './user-repo.js';

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

export type Column = ColumnV2;
type StoredColumn = ColumnV1 | ColumnV2;

const BOARD_ID = 'boardId';

export function zColumn() {
    return zDoc(z.tuple([zUuid<ColumnId>()])).extend({
        id: zUuid<ColumnId>(),
        authorId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        title: z.string(),
        version: z.literal(2),
        boardPosition: zBigFloat(),
    });
}

export class ColumnRepo {
    public readonly rawRepo: DocRepo<Column>;

    constructor(
        tx: Uint8Transaction,
        boardRepo: BoardRepo,
        userRepo: UserRepo,
        onChange: OnDocChange<Column>
    ) {
        this.rawRepo = new DocRepo<Column>({
            tx: withPrefix('d/')(tx),
            onChange,
            indexes: {
                [BOARD_ID]: x => [x.boardId],
            },
            schema: zColumn(),
            upgrade: function upgradeColumn(column: StoredColumn) {
                if ('version' in column) {
                    if (typeof column.version === 'number') {
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
            readonly: {
                boardId: true,
                id: true,
                authorId: true,
                version: true,
                title: false,
                boardPosition: false,
            },
        });
    }

    async getById(id: ColumnId, includeDeleted: boolean) {
        return await this.rawRepo.getById([id], includeDeleted);
    }

    getByBoardId(boardId: BoardId): Stream<Column> {
        return this.rawRepo.get(BOARD_ID, [boardId]);
    }

    async apply(id: Uuid, diff: CrdtDiff<Column>) {
        return await this.rawRepo.apply([id], diff);
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
