import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {
    type CrdtDoc,
    DocRepo,
    type OnDocChange,
    type QueryOptions,
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
            position: Type.Number(),
        }),
    ]);
}

export interface Column extends Static<ReturnType<typeof zColumn>> {}

export class ColumnRepo {
    public readonly rawRepo: DocRepo<Column>;

    constructor(params: {
        tx: AppTransaction;
        boardRepo: BoardRepo;
        userRepo: UserRepo;
        onChange: OnDocChange<Column>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<Column>({
            tx: isolate(['d'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [BOARD_ID_INDEX]: x => [[x.boardId]],
                [AUTHOR_ID_INDEX]: x => [[x.authorId, x.createdAt]],
            },
            schema: zColumn(),
            constraints: [
                {
                    name: 'column.authorId fk',
                    verify: async column => {
                        const user = await params.userRepo.getById(
                            column.authorId,
                            {includeDeleted: true}
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
                        const board = await params.boardRepo.getById(
                            column.boardId
                        );
                        if (board === undefined) {
                            return `board not found: ${column.boardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    async getById(id: ColumnId, options?: QueryOptions) {
        return await this.rawRepo.getById([id], options);
    }

    getByBoardId(
        boardId: BoardId,
        options?: QueryOptions
    ): Stream<CrdtDoc<Column>> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId], options);
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
        options?: QueryOptions
    ): Promise<Column> {
        return this.rawRepo.update([id], recipe, options);
    }
}
