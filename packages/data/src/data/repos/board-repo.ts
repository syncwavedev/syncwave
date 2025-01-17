import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt';
import {BusinessError} from '../../errors';
import {Counter} from '../../kv/counter';
import {UniqueError} from '../../kv/data-index';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store';
import {Registry} from '../../kv/registry';
import {zTimestamp} from '../../timestamp';
import {Brand} from '../../utils';
import {Uuid, createUuid, zUuid} from '../../uuid';
import {Doc, DocRepo, OnDocChange, Recipe, SyncTarget} from '../doc-repo';
import {createWriteableChecker} from '../update-checker';
import {UserId} from './user-repo';

export type BoardId = Brand<Uuid, 'board_id'>;

export function createBoardId(): BoardId {
    return createUuid() as BoardId;
}

export interface Board extends Doc<BoardId> {
    readonly slug?: string;
    name: string;
    ownerId: UserId;
    deleted: boolean;
}

const SLUG_INDEX = 'slug';

export class BoardRepo implements SyncTarget<Board> {
    private readonly store: DocRepo<Board>;
    private readonly counters: Registry<Counter>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<Board>) {
        this.store = new DocRepo<Board>({
            txn: withPrefix('d/')(txn),
            onChange,
            indexes: {
                [SLUG_INDEX]: {
                    key: x => [x.slug],
                    unique: true,
                    include: x => x.slug !== undefined,
                },
            },
            schema: z.object({
                id: zUuid<BoardId>(),
                createdAt: zTimestamp(),
                updatedAt: zTimestamp(),
                name: z.string(),
                ownerId: zUuid<UserId>(),
                deleted: z.boolean(),
            }),
        });
        this.counters = new Registry(withPrefix('c/')(txn), counterTxn => new Counter(counterTxn, 0));
    }

    async apply(id: Uuid, diff: CrdtDiff<Board>): Promise<void> {
        return await this.store.apply(
            id,
            diff,
            createWriteableChecker({
                deleted: true,
                name: true,
                ownerId: true,
            })
        );
    }

    async getById(id: BoardId): Promise<Board | undefined> {
        return await this.store.getById(id);
    }

    async incrementBoardCounter(boardId: BoardId): Promise<number> {
        return await this.counters.get(boardId.toString()).increment();
    }

    async checkSlugAvailable(slug: string): Promise<boolean> {
        const existingBoard = await this.store.getUnique(SLUG_INDEX, [slug]);

        return existingBoard === undefined;
    }

    async create(board: Board): Promise<void> {
        try {
            return await this.store.create(board);
        } catch (err) {
            // todo: map errors in AggregateError
            if (err instanceof UniqueError && err.indexName === SLUG_INDEX) {
                throw new BusinessError(`board with slug ${board.slug} already exists`);
            }

            throw err;
        }
    }

    async update(id: BoardId, recipe: Recipe<Board>): Promise<Board> {
        try {
            return await this.store.update(id, recipe);
        } catch (err) {
            if (err instanceof UniqueError && err.indexName === SLUG_INDEX) {
                throw new BusinessError(`board with slug already exists`);
            }

            throw err;
        }
    }
}
