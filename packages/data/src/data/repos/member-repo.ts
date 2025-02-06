import {z} from 'zod';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {UserId, UserRepo} from './user-repo.js';

export type MemberId = Brand<Uuid, 'member_id'>;

export function createMemberId(): MemberId {
    return createUuid() as MemberId;
}

export interface Member extends Doc<[MemberId]> {
    readonly id: MemberId;
    readonly userId: UserId;
    readonly boardId: BoardId;
    active: boolean;
}

const USER_ID_BOARD_ID_INDEX = 'userId_boardId';
const BOARD_ID_INDEX = 'boardId';

export function zMember() {
    return zDoc(z.tuple([zUuid<MemberId>()])).extend({
        id: zUuid<MemberId>(),
        userId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        active: z.boolean(),
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
                        const user = await userRepo.getById(member.userId);
                        return user !== undefined;
                    },
                },
                {
                    name: 'member.boardId fk',
                    verify: async member => {
                        const board = await boardRepo.getById(member.boardId);
                        return board !== undefined;
                    },
                },
            ],
            changeChecker: createWriteableChecker({
                active: true,
            }),
        });
    }

    getById(id: MemberId): Promise<Member | undefined> {
        return this.rawRepo.getById([id]);
    }

    getByUserId(userId: UserId, activeOnly = true): Stream<Member> {
        return this.rawRepo
            .get(USER_ID_BOARD_ID_INDEX, [userId])
            .filter(x => x.active || !activeOnly);
    }

    getByBoardId(boardId: BoardId, activeOnly = true): Stream<Member> {
        return this.rawRepo
            .get(BOARD_ID_INDEX, [boardId])
            .filter(x => x.active || !activeOnly);
    }

    async getByUserIdAndBoardId(
        userId: UserId,
        boardId: BoardId,
        activeOnly = true
    ): Promise<Member | undefined> {
        const result = await this.rawRepo.getUnique(USER_ID_BOARD_ID_INDEX, [
            userId,
            boardId,
        ]);

        if (!result) {
            return undefined;
        }

        if (!result.active && activeOnly) {
            return undefined;
        }

        return result;
    }

    async apply(id: Uuid, diff: CrdtDiff<Member>): Promise<void> {
        return await this.rawRepo.apply([id], diff);
    }

    create(member: Omit<Member, 'pk'>): Promise<Member> {
        return this.rawRepo.create({pk: [member.id], ...member});
    }

    update(id: MemberId, recipe: Recipe<Member>): Promise<Member> {
        return this.rawRepo.update([id], recipe);
    }
}
