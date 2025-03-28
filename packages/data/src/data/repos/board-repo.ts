import {Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {Counter} from '../../kv/counter.js';
import {UniqueError} from '../../kv/data-index.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Registry} from '../../kv/registry.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import {type DataTriggerScheduler} from '../data-layer.js';
import {
    type Doc,
    DocRepo,
    type OnDocChange,
    type Recipe,
    zDoc,
} from '../doc-repo.js';
import type {TransitionChecker} from '../transition-checker.js';
import type {UserId, UserRepo} from './user-repo.js';

export type BoardId = Brand<Uuid, 'board_id'>;

export function createBoardId(): BoardId {
    return createUuid() as BoardId;
}

export interface Board extends Doc<[BoardId]> {
    readonly key: string;
    readonly id: BoardId;
    readonly authorId: UserId;
    name: string;
}

const BOARD_KEY_INDEX = 'key';
const AUTHOR_ID_INDEX = 'author_id';

export function zBoard() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<BoardId>()])),
        Type.Object({
            id: Uuid<BoardId>(),
            key: Type.String(),
            name: Type.String(),
            authorId: Uuid<UserId>(),
            deleted: Type.Boolean(),
        }),
    ]);
}

export class BoardRepo {
    public readonly rawRepo: DocRepo<Board>;
    protected readonly counters: Registry<Counter>;

    constructor(params: {
        tx: AppTransaction;
        users: UserRepo;
        onChange: OnDocChange<Board>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<Board>({
            tx: isolate(['d'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [BOARD_KEY_INDEX]: {
                    key: x => [x.key],
                    unique: true,
                    include: x => x.key !== undefined,
                },
                [AUTHOR_ID_INDEX]: {
                    key: x => [x.authorId, x.createdAt],
                    include: x => x.authorId !== undefined,
                },
            },
            schema: zBoard(),
            constraints: [
                {
                    name: 'board.ownerId fk',
                    verify: async board => {
                        const user = await params.users.getById(
                            board.authorId,
                            true
                        );
                        if (user === undefined) {
                            return `user with id ${board.authorId} does not exist`;
                        }

                        return;
                    },
                },
            ],
        });
        this.counters = new Registry(
            isolate(['c'])(params.tx),
            counterTxn => new Counter(counterTxn, 0)
        );
    }

    async getById(id: BoardId, includeDeleted = false) {
        return await this.rawRepo.getById([id], includeDeleted);
    }

    async getByKey(key: string): Promise<Board | undefined> {
        return await this.rawRepo.getUnique(BOARD_KEY_INDEX, [key]);
    }

    async checkKeyAvailable(key: string): Promise<boolean> {
        const existingBoard = await this.rawRepo.getUnique(BOARD_KEY_INDEX, [
            key,
        ]);

        return existingBoard === undefined;
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Board>,
        checker: TransitionChecker<Board>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    async incrementBoardCounter(boardId: BoardId): Promise<number> {
        return await this.counters.get(boardId.toString()).increment();
    }

    async create(board: Omit<Board, 'pk'>): Promise<Board> {
        try {
            return await this.rawRepo.create({pk: [board.id], ...board});
        } catch (err) {
            // todo: map errors in AggregateError
            if (
                err instanceof UniqueError &&
                err.indexName === BOARD_KEY_INDEX
            ) {
                throw new BusinessError(
                    `board with key ${board.key} already exists`,
                    'board_key_taken'
                );
            }

            throw err;
        }
    }

    async update(
        id: BoardId,
        recipe: Recipe<Board>,
        includeDeleted = false
    ): Promise<Board> {
        try {
            return await this.rawRepo.update([id], recipe, includeDeleted);
        } catch (err) {
            if (
                err instanceof UniqueError &&
                err.indexName === BOARD_KEY_INDEX
            ) {
                throw new BusinessError(
                    'board with key already exists',
                    'board_key_taken'
                );
            }

            throw err;
        }
    }
}
