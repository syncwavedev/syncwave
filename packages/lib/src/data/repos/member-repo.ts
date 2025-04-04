import {type Static, Type} from '@sinclair/typebox';
import type {CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {UniqueError} from '../../kv/data-index.js';
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

export type MemberId = Brand<Uuid, 'member_id'>;

export function createMemberId(): MemberId {
    return createUuid() as MemberId;
}

export type MemberRole = 'owner' | 'admin' | 'writer' | 'reader';

export function zMemberRole() {
    return Type.Union([
        Type.Literal('owner'),
        Type.Literal('admin'),
        Type.Literal('writer'),
        Type.Literal('reader'),
    ]);
}

export const ROLE_ORDER: Record<MemberRole, number> = {
    owner: 40,
    admin: 30,
    writer: 20,
    reader: 10,
};

export const MEMBER_ROLES = Object.keys(ROLE_ORDER) as MemberRole[];

const USER_ID_BOARD_ID_INDEX = 'userId_boardId';
const BOARD_ID_INDEX = 'boardId';

export function zMember() {
    return Type.Composite([
        zDoc(Type.Tuple([Uuid<MemberId>()])),
        Type.Object({
            id: Uuid<MemberId>(),
            userId: Uuid<UserId>(),
            boardId: Uuid<BoardId>(),
            role: zMemberRole(),
            position: Type.Number(),
        }),
    ]);
}

export interface Member extends Static<ReturnType<typeof zMember>> {}

export class MemberRepo {
    public readonly rawRepo: DocRepo<Member>;

    constructor(params: {
        tx: AppTransaction;
        userRepo: UserRepo;
        boardRepo: BoardRepo;
        onChange: OnDocChange<Member>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<Member>({
            tx: isolate(['d'])(params.tx),
            scheduleTrigger: params.scheduleTrigger,
            onChange: params.onChange,
            indexes: {
                [USER_ID_BOARD_ID_INDEX]: {
                    key: x => [x.userId, x.boardId],
                    unique: true,
                },
                [BOARD_ID_INDEX]: x => [x.boardId],
            },
            schema: zMember(),
            constraints: [
                {
                    name: 'member.userId fk',
                    verify: async member => {
                        const user = await params.userRepo.getById(
                            member.userId,
                            {includeDeleted: true}
                        );
                        if (user === undefined) {
                            return `user not found: ${member.userId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'member.boardId fk',
                    verify: async member => {
                        const board = await params.boardRepo.getById(
                            member.boardId
                        );
                        if (board === undefined) {
                            return `board not found: ${member.boardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    async getById(id: MemberId, options?: QueryOptions) {
        return await this.rawRepo.getById([id], options);
    }

    getByUserId(userId: UserId, options?: QueryOptions): Stream<Member> {
        return this.rawRepo.get(USER_ID_BOARD_ID_INDEX, [userId], options);
    }

    getByBoardId(
        boardId: BoardId,
        options?: QueryOptions
    ): Stream<CrdtDoc<Member>> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId], options);
    }

    async getByUserIdAndBoardId(
        userId: UserId,
        boardId: BoardId,
        options?: QueryOptions
    ): Promise<Member | undefined> {
        const result = await this.rawRepo.getUnique(
            USER_ID_BOARD_ID_INDEX,
            [userId, boardId],
            options
        );

        if (!result) {
            return undefined;
        }

        return result;
    }

    async apply(
        id: Uuid,
        diff: CrdtDiff<Member>,
        checker: TransitionChecker<Member>
    ) {
        return await this.rawRepo.apply([id], diff, checker);
    }

    async create(member: Omit<Member, 'pk'>): Promise<Member> {
        try {
            return await this.rawRepo.create({pk: [member.id], ...member});
        } catch (error) {
            if (
                error instanceof UniqueError &&
                error.indexName === USER_ID_BOARD_ID_INDEX
            ) {
                throw new BusinessError(
                    `member with userId ${member.userId} and boardId ${member.boardId} already exists`,
                    'member_exists'
                );
            }

            throw error;
        }
    }

    async update(
        id: MemberId,
        recipe: Recipe<Member>,
        options?: QueryOptions
    ): Promise<Member> {
        return await this.rawRepo.update([id], recipe, options);
    }
}
