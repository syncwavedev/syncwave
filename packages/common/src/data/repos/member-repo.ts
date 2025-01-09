import {AsyncStream} from '../../async-stream';
import {Uint8Transaction, withPrefix} from '../../kv/kv-store';
import {Brand} from '../../utils';
import {Uuid, createUuid} from '../../uuid';
import {Doc, DocRepo, OnDocChange, Recipe} from '../doc-repo';
import {BoardId} from './board-repo';
import {UserId} from './user-repo';

export type MemberId = Brand<Uuid, 'member_id'>;

export function createMemberId(): MemberId {
    return createUuid() as MemberId;
}

export interface Member extends Doc<MemberId> {
    id: MemberId;
    userId: UserId;
    boardId: BoardId;
}

const USER_ID_BOARD_ID_INDEX = 'userId_boardId';
const BOARD_ID_INDEX = 'boardId';

export class MemberRepo {
    private readonly store: DocRepo<Member>;

    constructor(txn: Uint8Transaction, onChange: OnDocChange<Member>) {
        this.store = new DocRepo<Member>({
            txn: withPrefix('d/')(txn),
            onChange,
            indexes: {
                [USER_ID_BOARD_ID_INDEX]: {
                    key: x => [x.userId, x.boardId],
                    unique: true,
                },
                [BOARD_ID_INDEX]: x => [x.boardId],
            },
        });
    }

    create(member: Member): Promise<void> {
        return this.store.create(member);
    }

    getById(id: MemberId): Promise<Member | undefined> {
        return this.store.getById(id);
    }

    getByUserId(userId: UserId): AsyncStream<Member> {
        return this.store.get(USER_ID_BOARD_ID_INDEX, [userId]);
    }

    getByBoardId(boardId: BoardId): AsyncStream<Member> {
        return this.store.get(BOARD_ID_INDEX, [boardId]);
    }

    getByUserIdAndBoardId(userId: UserId, boardId: BoardId): Promise<Member | undefined> {
        return this.store.getUnique(USER_ID_BOARD_ID_INDEX, [userId, boardId]);
    }

    update(id: MemberId, recipe: Recipe<Member>): Promise<Member> {
        return this.store.update(id, recipe);
    }
}
