import {UniqueError} from '../../kv/data-index';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store';
import {Brand} from '../../utils';
import {Uuid} from '../../uuid';
import {Doc, DocRepo, OnDocChange, Recipe} from '../doc-repo';
import {createWriteableChecker} from '../update-checker';
import {UserId} from './user-repo';

export type BoardId = Brand<Uuid, 'board_id'>;

export interface Board extends Doc<BoardId> {
    readonly slug: string;
    name: string;
    ownerId: UserId;
    deleted: boolean;
}

const SLUG_INDEX = 'slug';

export class BoardRepo {
    private readonly store: DocRepo<Board>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<Board>) {
        this.store = new DocRepo<Board>({
            txn: withPrefix('d/')(txn),
            onChange,
            indexes: {
                [SLUG_INDEX]: {
                    key: x => [x.slug],
                    unique: true,
                },
            },
            updateChecker: createWriteableChecker({
                deleted: true,
                name: true,
                ownerId: true,
            }),
        });
    }

    getById(id: BoardId): Promise<Board | undefined> {
        return this.store.getById(id);
    }

    async checkSlugAvailable(slug: string): Promise<boolean> {
        const existingBoard = await this.store.getUnique(SLUG_INDEX, [slug]);

        return existingBoard === undefined;
    }

    async create(board: Board): Promise<void> {
        try {
            return await this.store.create(board);
        } catch (err) {
            if (err instanceof UniqueError && err.indexName === SLUG_INDEX) {
                throw new Error(`board with slug ${board.slug} already exists`);
            }

            throw err;
        }
    }

    update(id: BoardId, recipe: Recipe<Board>): Promise<Board> {
        return this.store.update(id, recipe);
    }
}
