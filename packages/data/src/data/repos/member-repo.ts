import {Type} from '@sinclair/typebox';
import {type BigFloat, toBigFloat, zBigFloat} from '../../big-float.js';
import type {CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {UniqueError} from '../../kv/data-index.js';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {type Brand, unreachable} from '../../utils.js';
import {createUuid, Uuid} from '../../uuid.js';
import {
    type CrdtDoc,
    type Doc,
    DocRepo,
    type OnDocChange,
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

interface MemberV1 extends Doc<[MemberId]> {
    readonly id: MemberId;
    readonly userId: UserId;
    readonly boardId: BoardId;
    role: MemberRole;
}

export interface MemberV2 extends Doc<[MemberId]> {
    readonly id: MemberId;
    readonly userId: UserId;
    readonly boardId: BoardId;
    readonly version: '2';
    role: MemberRole;
    position: BigFloat;
}

export interface Member extends MemberV2 {}
type StoredMember = MemberV1 | MemberV2;

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
            version: Type.Literal('2'),
            position: zBigFloat(),
        }),
    ]);
}

export class MemberRepo {
    public readonly rawRepo: DocRepo<Member>;

    constructor(
        tx: AppTransaction,
        userRepo: UserRepo,
        boardRepo: BoardRepo,
        onChange: OnDocChange<Member>
    ) {
        this.rawRepo = new DocRepo<Member>({
            tx: isolate(['d'])(tx),
            onChange,
            indexes: {
                [USER_ID_BOARD_ID_INDEX]: {
                    key: x => [x.userId, x.boardId],
                    unique: true,
                },
                [BOARD_ID_INDEX]: x => [x.boardId],
            },
            schema: zMember(),
            upgrade: function upgrade(doc: StoredMember): void {
                if ('version' in doc) {
                    if (doc.version === '2') {
                        // latest version
                    } else {
                        unreachable();
                    }
                } else {
                    (doc as any).version = '2';
                    (doc as any).position = toBigFloat(Math.random());

                    upgrade(doc);
                }
            },
            constraints: [
                {
                    name: 'member.userId fk',
                    verify: async member => {
                        const user = await userRepo.getById(
                            member.userId,
                            true
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
                        const board = await boardRepo.getById(member.boardId);
                        if (board === undefined) {
                            return `board not found: ${member.boardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    async getById(id: MemberId, includeDeleted: boolean) {
        return await this.rawRepo.getById([id], includeDeleted);
    }

    getByUserId(userId: UserId, includeDeleted: boolean): Stream<Member> {
        return this.rawRepo.get(
            USER_ID_BOARD_ID_INDEX,
            [userId],
            includeDeleted
        );
    }

    getByBoardId(
        boardId: BoardId,
        includeDeleted = false
    ): Stream<CrdtDoc<Member>> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId], includeDeleted);
    }

    async getByUserIdAndBoardId(
        userId: UserId,
        boardId: BoardId,
        includeDeleted = false
    ): Promise<Member | undefined> {
        const result = await this.rawRepo.getUnique(
            USER_ID_BOARD_ID_INDEX,
            [userId, boardId],
            includeDeleted
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
        includeDeleted = false
    ): Promise<Member> {
        return await this.rawRepo.update([id], recipe, includeDeleted);
    }
}
