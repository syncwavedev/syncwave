import {type Static, Type} from '@sinclair/typebox';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import {Uuid} from '../../uuid.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {type QueryOptions} from './base/crdt-repo.js';
import {DocRepo, type OnDocChange} from './base/doc-repo.js';
import {Doc} from './base/doc.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {type UserId, UserRepo} from './user-repo.js';

const BOARD_ID_INDEX = 'board_id_v2';
const USER_ID_INDEX = 'user_id';

export function BoardCursor() {
    return Type.Composite([
        Doc(Type.Tuple([Uuid<UserId>(), BoardId()])),
        Type.Object({
            userId: Uuid<UserId>(),
            boardId: Uuid<BoardId>(),
            timestamp: Type.Number(),
        }),
    ]);
}

export interface BoardCursor extends Static<ReturnType<typeof BoardCursor>> {}

export class BoardCursorRepo {
    public readonly rawRepo: DocRepo<BoardCursor>;

    constructor(params: {
        tx: AppTransaction;
        boardRepo: BoardRepo;
        userRepo: UserRepo;
        onChange: OnDocChange<BoardCursor>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<BoardCursor>({
            tx: isolate(['repo'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [BOARD_ID_INDEX]: {
                    key: x => [[x.boardId]],
                },
                [USER_ID_INDEX]: {
                    key: x => [[x.userId]],
                },
            },
            schema: BoardCursor(),
            constraints: [
                {
                    name: 'timelineCursor.userId fk',
                    verify: async timelineCursor => {
                        const user = await params.userRepo.getById(
                            timelineCursor.userId
                        );
                        if (user === undefined) {
                            return `author not found: ${timelineCursor.userId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'timelineCursor.boardId fk',
                    verify: async timelineCursor => {
                        const board = await params.boardRepo.getById(
                            timelineCursor.boardId
                        );
                        if (board === undefined) {
                            return `board not found: ${timelineCursor.boardId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    getById(userId: UserId, boardId: BoardId, options?: QueryOptions) {
        return this.rawRepo.getById([userId, boardId], options);
    }

    getByBoardId(
        boardId: BoardId,
        options?: QueryOptions
    ): Stream<BoardCursor> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId], options);
    }

    create(cursor: Omit<BoardCursor, 'pk'>): Promise<BoardCursor> {
        return this.rawRepo.create({
            pk: [cursor.userId, cursor.boardId],
            ...cursor,
        });
    }

    put(cursor: Omit<BoardCursor, 'pk'>): Promise<BoardCursor> {
        return this.rawRepo.put({
            pk: [cursor.userId, cursor.boardId],
            ...cursor,
        });
    }
}
