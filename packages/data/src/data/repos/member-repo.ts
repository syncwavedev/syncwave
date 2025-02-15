import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {BusinessError} from '../../errors.js';
import {UniqueError} from '../../kv/data-index.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {UserId, UserRepo} from './user-repo.js';

export type MemberId = Brand<Uuid, 'member_id'>;

export function createMemberId(): MemberId {
    return createUuid() as MemberId;
}

export type MemberRole = 'owner' | 'admin' | 'writer' | 'reader';

export function zMemberRole() {
    return z.union([
        z.literal('owner'),
        z.literal('admin'),
        z.literal('writer'),
        z.literal('reader'),
    ]);
}

export const ROLE_ORDER: Record<MemberRole, number> = {
    owner: 40,
    admin: 30,
    writer: 20,
    reader: 10,
};

export const MEMBER_ROLES = Object.keys(ROLE_ORDER) as MemberRole[];

export interface Member extends Doc<[MemberId]> {
    readonly id: MemberId;
    readonly userId: UserId;
    readonly boardId: BoardId;
    role: MemberRole;
}

const USER_ID_BOARD_ID_INDEX = 'userId_boardId';
const BOARD_ID_INDEX = 'boardId';

export function zMember() {
    return zDoc(z.tuple([zUuid<MemberId>()])).extend({
        id: zUuid<MemberId>(),
        userId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        role: zMemberRole(),
    });
}

export class MemberRepo {
    public readonly rawRepo: DocRepo<Member>;

    constructor(
        tx: Uint8Transaction,
        userRepo: UserRepo,
        boardRepo: BoardRepo,
        onChange: OnDocChange<Member>
    ) {
        this.rawRepo = new DocRepo<Member>({
            tx: withPrefix('d/')(tx),
            onChange,
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
            readonly: {
                boardId: true,
                id: true,
                userId: true,
                role: false,
            },
        });
    }

    async getById(
        id: MemberId,
        includeDeleted: boolean
    ): Promise<Member | undefined> {
        return await this.rawRepo.getById([id], includeDeleted);
    }

    getByUserId(userId: UserId, includeDeleted: boolean): Stream<Member> {
        return this.rawRepo.get(
            USER_ID_BOARD_ID_INDEX,
            [userId],
            includeDeleted
        );
    }

    getByBoardId(boardId: BoardId): Stream<Member> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId]);
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

    async apply(id: Uuid, diff: CrdtDiff<Member>) {
        return await this.rawRepo.apply([id], diff);
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
