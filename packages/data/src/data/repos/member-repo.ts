import {AsyncStream} from '../../async-stream.js';
import {CrdtDiff} from '../../crdt/crdt.js';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store.js';
import {Brand} from '../../utils.js';
import {Uuid, createUuid, zUuid} from '../../uuid.js';
import {
    Doc,
    DocRepo,
    OnDocChange,
    Recipe,
    SyncTarget,
    zDoc,
} from '../doc-repo.js';
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
}

const USER_ID_BOARD_ID_INDEX = 'userId_boardId';
const BOARD_ID_INDEX = 'boardId';

export function zMember() {
    return zDoc<MemberId>().extend({
        userId: zUuid<UserId>(),
        boardId: zUuid<BoardId>(),
    });
}

export class MemberRepo implements SyncTarget<Member> {
    public readonly rawRepo: DocRepo<Member>;

    constructor(tx: Uint8Transaction, onChange: OnDocChange<Member>) {
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
        });
    }

    async apply(id: Uuid, diff: CrdtDiff<Member>): Promise<void> {
        return await this.rawRepo.apply(
            id,
            diff,
            createWriteableChecker({
                boardId: false,
                userId: false,
            })
        );
    }

    create(member: Member): Promise<Member> {
        return this.rawRepo.create(member);
    }

    getById(id: MemberId): Promise<Member | undefined> {
        return this.rawRepo.getById(id);
    }

    getByUserId(userId: UserId): AsyncStream<Member> {
        return this.rawRepo.get(USER_ID_BOARD_ID_INDEX, [userId]);
    }

    getByBoardId(boardId: BoardId): AsyncStream<Member> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId]);
    }

    getByUserIdAndBoardId(
        userId: UserId,
        boardId: BoardId
    ): Promise<Member | undefined> {
        return this.rawRepo.getUnique(USER_ID_BOARD_ID_INDEX, [
            userId,
            boardId,
        ]);
    }

    update(id: MemberId, recipe: Recipe<Member>): Promise<Member> {
        return this.rawRepo.update(id, recipe);
    }
}
