import {type Static, Type} from '@sinclair/typebox';
import {type CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {Counter} from '../../kv/counter.js';
import {UniqueError} from '../../kv/data-index.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Registry} from '../../kv/registry.js';
import {type Brand} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import {type DataTriggerScheduler} from '../data-layer.js';
import type {TransitionChecker} from '../transition-checker.js';
import {
    CrdtRepo,
    type OnCrdtChange,
    type QueryOptions,
    type Recipe,
} from './base/crdt-repo.js';
import {Doc} from './base/doc.js';
import {MemberRole} from './member-repo.js';
import type {UserId, UserRepo} from './user-repo.js';

export type BoardId = Brand<Uuid, 'board_id'>;

export function createBoardId(): BoardId {
    return createUuid() as BoardId;
}

const BOARD_KEY_INDEX = 'key';
const AUTHOR_ID_INDEX = 'author_id';
const JOIN_CODE_INDEX = 'join_code';

export function Board() {
    return Type.Composite([
        Doc(Type.Tuple([Uuid<BoardId>()])),
        Type.Object({
            id: Uuid<BoardId>(),
            key: Type.String(),
            name: Type.String(),
            authorId: Uuid<UserId>(),
            joinCode: Type.String(),
            joinRole: MemberRole(),
        }),
    ]);
}

export interface Board extends Static<ReturnType<typeof Board>> {}

export class BoardRepo {
    public readonly rawRepo: CrdtRepo<Board>;
    protected readonly counters: Registry<Counter>;

    constructor(params: {
        tx: AppTransaction;
        users: UserRepo;
        onChange: OnCrdtChange<Board>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new CrdtRepo<Board>({
            tx: isolate(['d'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [BOARD_KEY_INDEX]: {
                    key: x => [[x.key]],
                    unique: true,
                    filter: x => x.key !== undefined,
                },
                [AUTHOR_ID_INDEX]: {
                    key: x => [[x.authorId, x.createdAt]],
                    filter: x => x.authorId !== undefined,
                },
                [JOIN_CODE_INDEX]: {
                    key: x => [[x.joinCode]],
                    unique: true,
                    filter: x => x.joinCode !== undefined,
                },
            },
            schema: Board(),
            constraints: [
                {
                    name: 'board.ownerId fk',
                    verify: async board => {
                        const user = await params.users.getById(board.authorId);
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

    async getById(id: BoardId, options?: QueryOptions) {
        return await this.rawRepo.getById([id], options);
    }

    async getByKey(key: string): Promise<Board | undefined> {
        return await this.rawRepo.getUnique(BOARD_KEY_INDEX, [key]);
    }

    async getByJoinCode(
        code: string,
        options?: QueryOptions
    ): Promise<Board | undefined> {
        return await this.rawRepo.getUnique(JOIN_CODE_INDEX, [code], options);
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

    async incrementBoardCounter(boardId: BoardId, delta = 1): Promise<number> {
        return await this.counters.get(boardId.toString()).increment(delta);
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
        options?: QueryOptions
    ): Promise<Board> {
        try {
            return await this.rawRepo.update([id], recipe, options);
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
