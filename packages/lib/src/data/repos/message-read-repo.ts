import {type Static, Type} from '@sinclair/typebox';
import {type AppTransaction, isolate} from '../../kv/kv-store.js';
import {Stream} from '../../stream.js';
import type {DataTriggerScheduler} from '../data-layer.js';
import {type QueryOptions} from './base/crdt-repo.js';
import {DocRepo, type OnDocChange} from './base/doc-repo.js';
import {Doc} from './base/doc.js';
import {BoardId, BoardRepo} from './board-repo.js';
import {MessageId, MessageRepo} from './message-repo.js';
import {UserId, UserRepo} from './user-repo.js';

const BOARD_ID_INDEX = 'board_id';
const MESSAGE_ID_INDEX = 'message_id';
const USER_ID_INDEX = 'user_id';

export function MessageRead() {
    return Type.Composite([
        Doc(Type.Tuple([UserId(), MessageId()])),
        Type.Object({
            userId: UserId(),
            messageId: MessageId(),
            boardId: BoardId(),
            timestamp: Type.Number(),
        }),
    ]);
}

export interface MessageRead extends Static<ReturnType<typeof MessageRead>> {}

export class MessageReadRepo {
    public readonly rawRepo: DocRepo<MessageRead>;

    constructor(params: {
        tx: AppTransaction;
        boardRepo: BoardRepo;
        userRepo: UserRepo;
        messageRepo: MessageRepo;
        onChange: OnDocChange<MessageRead>;
        scheduleTrigger: DataTriggerScheduler;
    }) {
        this.rawRepo = new DocRepo<MessageRead>({
            tx: isolate(['repo'])(params.tx),
            onChange: params.onChange,
            scheduleTrigger: params.scheduleTrigger,
            indexes: {
                [BOARD_ID_INDEX]: {
                    key: x => [[x.boardId]],
                },
                [MESSAGE_ID_INDEX]: {
                    key: x => [[x.messageId]],
                },
                [USER_ID_INDEX]: {
                    key: x => [[x.userId]],
                },
            },
            schema: MessageRead(),
            constraints: [
                {
                    name: 'messageRead.userId fk',
                    verify: async messageRead => {
                        const user = await params.userRepo.getById(
                            messageRead.userId
                        );
                        if (user === undefined) {
                            return `author not found: ${messageRead.userId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'messageRead.boardId fk',
                    verify: async messageRead => {
                        const board = await params.boardRepo.getById(
                            messageRead.boardId
                        );
                        if (board === undefined) {
                            return `board not found: ${messageRead.boardId}`;
                        }
                        return;
                    },
                },
                {
                    name: 'messageRead.messageId fk',
                    verify: async messageRead => {
                        const board = await params.messageRepo.getById(
                            messageRead.messageId
                        );
                        if (board === undefined) {
                            return `board not found: ${messageRead.messageId}`;
                        }
                        return;
                    },
                },
            ],
        });
    }

    getById(userId: UserId, messageId: MessageId, options?: QueryOptions) {
        return this.rawRepo.getById([userId, messageId], options);
    }

    getByBoardId(
        boardId: BoardId,
        options?: QueryOptions
    ): Stream<MessageRead> {
        return this.rawRepo.get(BOARD_ID_INDEX, [boardId], options);
    }

    getByMessageId(messageId: MessageId | null): Stream<MessageRead> {
        return this.rawRepo.get(MESSAGE_ID_INDEX, [messageId]);
    }

    create(messageRead: Omit<MessageRead, 'pk'>): Promise<MessageRead> {
        return this.rawRepo.create({
            pk: [messageRead.userId, messageRead.messageId],
            ...messageRead,
        });
    }

    put(messageRead: Omit<MessageRead, 'pk'>): Promise<MessageRead> {
        return this.rawRepo.put({
            pk: [messageRead.userId, messageRead.messageId],
            ...messageRead,
        });
    }
}
