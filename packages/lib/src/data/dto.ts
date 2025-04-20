import {Type, type Static} from '@sinclair/typebox';
import {CrdtDiff} from '../crdt/crdt.js';
import {assert} from '../utils.js';
import {Uuid} from '../uuid.js';
import {type DataTx} from './data-layer.js';
import {Account, type AccountId} from './repos/account-repo.js';
import {Attachment, type AttachmentId} from './repos/attachment-repo.js';
import {Board, type BoardId} from './repos/board-repo.js';
import {Card, CardId} from './repos/card-repo.js';
import {Column, type ColumnId} from './repos/column-repo.js';
import {Member, MemberRole, type MemberId} from './repos/member-repo.js';
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
        account: Type.Object({
            id: Uuid<AccountId>(),
            state: CrdtDiff<Account>(),
        }),
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
            })
        ),
    });
}

export interface MeViewDataDto
    extends Static<ReturnType<typeof MeViewDataDto>> {}

export function MemberInfoDto() {
    return Type.Object({
        userId: Uuid<UserId>(),
        email: Type.String(),
        role: MemberRole(),
    });
}

export type MemberInfoDto = Static<ReturnType<typeof MemberInfoDto>>;

export function BoardViewDataDto() {
    return Type.Object({
        members: Type.Array(MemberInfoDto()),
        board: Type.Object({
            state: CrdtDiff<Board>(),
            id: Uuid<BoardId>(),
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

export function CardTreeViewDataDto() {
    return Type.Object({
        messages: Type.Array(
            Type.Object({state: CrdtDiff<Message>(), id: Uuid<MessageId>()})
        ),
        attachments: Type.Array(
            Type.Object({
                state: CrdtDiff<Attachment>(),
                id: Uuid<AttachmentId>(),
            })
        ),
        users: Type.Array(
            Type.Object({state: CrdtDiff<User>(), id: Uuid<UserId>()})
        ),
        card: Type.Object({state: CrdtDiff<Card>(), id: Uuid<CardId>()}),
        boardId: Uuid<BoardId>(),
        userEmails: Type.Array(MemberInfoDto()),
    });
}

export interface CardTreeViewDataDto
    extends Static<ReturnType<typeof CardTreeViewDataDto>> {}
