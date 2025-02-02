import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {Counter} from '../../kv/counter.js';
import {UniqueError} from '../../kv/data-index.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Registry} from '../../kv/registry.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';
import {UserId} from './user-repo.js';

export type BoardId = Brand<Uuid, 'board_id'>;

export function createBoardId(): BoardId {
    return createUuid() as BoardId;
}

export interface Board extends Doc<BoardId> {
    readonly key: string;
    name: string;
    ownerId: UserId;
    deleted: boolean;
}

const SLUG_INDEX = 'key';

export function zBoard() {
    return zDoc<BoardId>().extend({
        key: z.string(),
        name: z.string(),
        ownerId: zUuid<UserId>(),
        deleted: z.boolean(),
    });
}

export class BoardRepo {
    public readonly rawRepo: DocRepo<Board>;
    protected readonly counters: Registry<Counter>;

    constructor(tx: Uint8Transaction, onChange: OnDocChange<Board>) {
        this.rawRepo = new DocRepo<Board>({
            tx: withPrefix('d/')(tx),
            onChange,
            indexes: {
                [SLUG_INDEX]: {
                    key: x => [x.key],
                    unique: true,
                    include: x => x.key !== undefined,
                },
            },
            schema: zBoard(),
        });
        this.counters = new Registry(
            withPrefix('c/')(tx),
            counterTxn => new Counter(counterTxn, 0)
        );
    }

    async getById(id: BoardId): Promise<Board | undefined> {
        return await this.rawRepo.getById(id);
    }

    async checkKeyAvailable(key: string): Promise<boolean> {
        const existingBoard = await this.rawRepo.getUnique(SLUG_INDEX, [key]);

        return existingBoard === undefined;
    }

    async apply(id: Uuid, diff: CrdtDiff<Board>): Promise<void> {
        return await this.rawRepo.apply(
            id,
            diff,
            createWriteableChecker({
                deleted: true,
                name: true,
                ownerId: true,
            })
        );
    }

    async incrementBoardCounter(boardId: BoardId): Promise<number> {
        return await this.counters.get(boardId.toString()).increment();
    }

    async create(board: Board): Promise<Board> {
        try {
            return await this.rawRepo.create(board);
        } catch (err) {
            // todo: map errors in AggregateError
            if (err instanceof UniqueError && err.indexName === SLUG_INDEX) {
                throw new BusinessError(
                    `board with key ${board.key} already exists`,
                    'board_key_taken'
                );
            }

            throw err;
        }
    }

    async update(id: BoardId, recipe: Recipe<Board>): Promise<Board> {
        try {
            return await this.rawRepo.update(id, recipe);
        } catch (err) {
            if (err instanceof UniqueError && err.indexName === SLUG_INDEX) {
                throw new BusinessError(
                    'board with key already exists',
                    'board_key_taken'
                );
            }

            throw err;
        }
    }
}
