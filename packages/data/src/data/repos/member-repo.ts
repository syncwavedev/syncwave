import {z} from 'zod';
import {AsyncStream} from '../../async-stream.js';
import {Cx} from '../../context.js';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {Doc, DocRepo, OnDocChange, Recipe, zDoc} from '../doc-repo.js';
import {createWriteableChecker} from '../update-checker.js';
import {BoardId} from './board-repo.js';
import {UserId} from './user-repo.js';

export type MemberId = Brand<Uuid, 'member_id'>;

export function createMemberId(): MemberId {
    return createUuid() as MemberId;
}

export interface Member extends Doc<MemberId> {
    readonly userId: UserId;
    readonly boardId: BoardId;
    active: boolean;
}

const USER_ID_BOARD_ID_INDEX = 'userId_boardId';
const BOARD_ID_INDEX = 'boardId';

export function zMember() {
    return zDoc<MemberId>().extend({
        userId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
        active: z.boolean(),
    });
}

export class MemberRepo {
    public readonly rawRepo: DocRepo<Member>;

    constructor(cx: Cx, tx: Uint8Transaction, onChange: OnDocChange<Member>) {
        this.rawRepo = new DocRepo<Member>(cx, {
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
        });
    }

    getById(cx: Cx, id: MemberId): Promise<Member | undefined> {
        return this.rawRepo.getById(cx, id);
    }

    getByUserId(
        cx: Cx,
        userId: UserId,
        activeOnly = true
    ): AsyncStream<Member> {
        return this.rawRepo
            .get(cx, USER_ID_BOARD_ID_INDEX, [userId])
            .filter(x => x.active || !activeOnly);
    }

    getByBoardId(
        cx: Cx,
        boardId: BoardId,
        activeOnly = true
    ): AsyncStream<Member> {
        return this.rawRepo
            .get(cx, BOARD_ID_INDEX, [boardId])
            .filter(x => x.active || !activeOnly);
    }

    async getByUserIdAndBoardId(
        cx: Cx,
        userId: UserId,
        boardId: BoardId,
        activeOnly = true
    ): Promise<Member | undefined> {
        const result = await this.rawRepo.getUnique(
            cx,
            USER_ID_BOARD_ID_INDEX,
            [userId, boardId]
        );

        if (!result) {
            return undefined;
        }

        if (!result.active && activeOnly) {
            return undefined;
        }

        return result;
    }

    async apply(cx: Cx, id: Uuid, diff: CrdtDiff<Member>): Promise<void> {
        return await this.rawRepo.apply(
            cx,
            id,
            diff,
            createWriteableChecker({
                active: true,
            })
        );
    }

    create(cx: Cx, member: Member): Promise<Member> {
        return this.rawRepo.create(cx, member);
    }

    update(cx: Cx, id: MemberId, recipe: Recipe<Member>): Promise<Member> {
        return this.rawRepo.update(cx, id, recipe);
    }
}
