import {Type, type Static} from '@sinclair/typebox';
import {CrdtDiff} from '../crdt/crdt.js';
import {Timestamp} from '../timestamp.js';
import {assert} from '../utils.js';
import {Uuid} from '../uuid.js';
import {type DataTx} from './data-layer.js';
import {Account} from './repos/account-repo.js';
import {Attachment, type AttachmentId} from './repos/attachment-repo.js';
import {Board, type BoardId} from './repos/board-repo.js';
import {Card, CardId} from './repos/card-repo.js';
import {Column, type ColumnId} from './repos/column-repo.js';
import {Member, MemberId, MemberRole} from './repos/member-repo.js';
import {Message, type MessageId} from './repos/message-repo.js';
import {User, type UserId} from './repos/user-repo.js';

export function AttachmentDto() {
    return Attachment();
}

export interface AttachmentDto
    extends Static<ReturnType<typeof AttachmentDto>> {}

export async function toAttachmentDto(
    tx: DataTx,
    attachmentId: AttachmentId
): Promise<AttachmentDto> {
    const attachment = await tx.attachments.getById(attachmentId);
    assert(
        attachment !== undefined,
        `toAttachmentDto: attachment not found: ${attachmentId}`
    );

    return attachment;
}

export function MeViewDataDto() {
    return Type.Object({
        profile: Type.Object({
            id: Uuid<UserId>(),
            state: CrdtDiff<User>(),
        }),
        account: Account(),
        members: Type.Array(
            Type.Object({
                id: Uuid<MemberId>(),
                state: CrdtDiff<Member>(),
            })
        ),
        boards: Type.Array(
            Type.Object({
                id: Uuid<BoardId>(),
                state: CrdtDiff<Board>(),
                membersCount: Type.Number(),
            })
        ),
    });
}

export interface MeViewDataDto
    extends Static<ReturnType<typeof MeViewDataDto>> {}

export function MemberInfoDto() {
    return Type.Object({
        userId: Uuid<UserId>(),
        memberId: Uuid<MemberId>(),
        email: Type.String(),
        role: MemberRole(),
    });
}

export type MemberInfoDto = Static<ReturnType<typeof MemberInfoDto>>;

export function MessageReadDto() {
    return Type.Object({
        userId: Uuid<UserId>(),
        boardId: Uuid<BoardId>(),
        messageId: Uuid<MessageId>(),
        timestamp: Type.Number(),
    });
}

export interface MessageReadDto
    extends Static<ReturnType<typeof MessageReadDto>> {}

export function BoardViewDataDto() {
    return Type.Object({
        members: Type.Array(MemberInfoDto()),
        messageReads: Type.Array(MessageReadDto()),
        memberId: MemberId(),
        board: Type.Object({
            state: CrdtDiff<Board>(),
            key: Type.String(),
            id: Uuid<BoardId>(),
            deletedAt: Type.Optional(Timestamp()),
        }),
        columns: Type.Array(
            Type.Object({state: CrdtDiff<Column>(), id: Uuid<ColumnId>()})
        ),
        cards: Type.Array(
            Type.Object({state: CrdtDiff<Card>(), id: Uuid<CardId>()})
        ),
        users: Type.Array(
            Type.Object({state: CrdtDiff<User>(), id: Uuid<UserId>()})
        ),
        messages: Type.Array(
            Type.Object({state: CrdtDiff<Message>(), id: Uuid<MessageId>()})
        ),
        attachments: Type.Array(
            Type.Object({
                state: CrdtDiff<Attachment>(),
                id: Uuid<AttachmentId>(),
            })
        ),
    });
}

export interface BoardViewDataDto
    extends Static<ReturnType<typeof BoardViewDataDto>> {}

export function UserDataDto() {
    return Type.Object({
        user: Type.Object({state: CrdtDiff<User>(), id: Uuid<UserId>()}),
    });
}

export interface UserDataDto extends Static<ReturnType<typeof UserDataDto>> {}
