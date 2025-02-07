import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {UserId, UserRepo} from './user-repo.js';

export type ColumnId = Brand<Uuid, 'column_id'>;

export function createColumnId(): ColumnId {
    return createUuid() as ColumnId;
}

export interface Column extends Doc<[ColumnId]> {
    readonly id: ColumnId;
    readonly authorId: UserId;
    readonly boardId: BoardId;
    title: string;
    deleted: boolean;
}

const BOARD_ID = 'boardId';

export function zColumn() {
    return zDoc(z.tuple([zUuid<ColumnId>()])).extend({
        id: zUuid<ColumnId>(),
        authorId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        title: z.string(),
        deleted: z.boolean(),
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
            constraints: [
                {
                    name: 'column.authorId fk',
                    verify: async column => {
                        const user = await userRepo.getById(column.authorId);
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
                deleted: false,
                title: false,
                authorId: true,
            },
        });
    }

    getById(id: ColumnId): Promise<Column | undefined> {
        return this.rawRepo.getById([id]);
    }

    getByBoardId(boardId: BoardId): Stream<Column> {
        return this.rawRepo.get(BOARD_ID, [boardId]);
    }

    async apply(id: Uuid, diff: CrdtDiff<Column>): Promise<void> {
        return await this.rawRepo.apply([id], diff);
    }

    create(user: Omit<Column, 'pk'>): Promise<Column> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(id: ColumnId, recipe: Recipe<Column>): Promise<Column> {
        return this.rawRepo.update([id], recipe);
    }
}
