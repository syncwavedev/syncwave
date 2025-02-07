import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {UserId, UserRepo} from './user-repo.js';

export type CategoryId = Brand<Uuid, 'category_id'>;

export function createCategoryId(): CategoryId {
    return createUuid() as CategoryId;
}

export interface Category extends Doc<[CategoryId]> {
    readonly id: CategoryId;
    readonly authorId: UserId;
    readonly boardId: BoardId;
    title: string;
    deleted: boolean;
}

const BOARD_ID = 'boardId';

export function zCategory() {
    return zDoc(z.tuple([zUuid<CategoryId>()])).extend({
        id: zUuid<CategoryId>(),
        authorId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        title: z.string(),
        deleted: z.boolean(),
    });
}

export class CategoryRepo {
    public readonly rawRepo: DocRepo<Category>;

    constructor(
        tx: Uint8Transaction,
        boardRepo: BoardRepo,
        userRepo: UserRepo,
        onChange: OnDocChange<Category>
    ) {
        this.rawRepo = new DocRepo<Category>({
            tx: withPrefix('d/')(tx),
            onChange,
            indexes: {
                [BOARD_ID]: x => [x.boardId],
            },
            schema: zCategory(),
            constraints: [
                {
                    name: 'category.authorId fk',
                    verify: async category => {
                        const user = await userRepo.getById(category.authorId);
                        if (user === undefined) {
                            return `user not found: ${category.authorId}`;
                        }

                        return;
                    },
                },
                {
                    name: 'category.boardId fk',
                    verify: async category => {
                        const board = await boardRepo.getById(category.boardId);
                        if (board === undefined) {
                            return `board not found: ${category.boardId}`;
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

    getById(id: CategoryId): Promise<Category | undefined> {
        return this.rawRepo.getById([id]);
    }

    getByBoardId(boardId: BoardId): Stream<Category> {
        return this.rawRepo.get(BOARD_ID, [boardId]);
    }

    async apply(id: Uuid, diff: CrdtDiff<Category>): Promise<void> {
        return await this.rawRepo.apply([id], diff);
    }

    create(user: Omit<Category, 'pk'>): Promise<Category> {
        return this.rawRepo.create({pk: [user.id], ...user});
    }

    update(id: CategoryId, recipe: Recipe<Category>): Promise<Category> {
        return this.rawRepo.update([id], recipe);
    }
}
