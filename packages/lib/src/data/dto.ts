import {Type, type Static} from '@sinclair/typebox';
import {CrdtDiff} from '../crdt/crdt.js';
import {assert, whenAll} from '../utils.js';
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

export function CardDto() {
    return Type.Composite([
        Card(),
        Type.Object({
            column: Type.Union([ColumnDto(), Type.Null()]),
            author: UserDto(),
            board: BoardDto(),
            assignee: Type.Union([UserDto(), Type.Null()]),
            state: CrdtDiff<Card>(),
        }),
    ]);
}

export interface CardDto extends Static<ReturnType<typeof CardDto>> {}

export async function toCardDto(tx: DataTx, cardId: CardId): Promise<CardDto> {
    const card = await tx.cards.getById(cardId, {includeDeleted: true});
    assert(card !== undefined, `toCardDto: card not found: ${cardId}`);
    const column = card.columnId ? await toColumnDto(tx, card.columnId) : null;
    const author = await toUserDto(tx, card.authorId);
    const board = await toBoardDto(tx, card.boardId);
    const assignee = card.assigneeId
        ? await toUserDto(tx, card.assigneeId)
        : null;

    return {...card, column, board, author, assignee};
}

export function CardViewDto() {
    return Type.Composite([
        CardDto(),
        Type.Object({
            messages: Type.Array(MessageDto()),
        }),
    ]);
}

export interface CardViewDto extends Static<ReturnType<typeof CardViewDto>> {}

export async function toCardViewDto(
    tx: DataTx,
    cardId: CardId
): Promise<CardViewDto> {
    const [card, messages] = await whenAll([
        toCardDto(tx, cardId),
        tx.messages
            .getByCardId(cardId)
            .mapParallel(x => toMessageDto(tx, x.id))
            .toArray(),
    ]);

    return {...card, messages};
}

export function BoardViewCardDto() {
    return Type.Composite([
        Card(),
        Type.Object({
            state: CrdtDiff<Card>(),
            column: Type.Union([ColumnDto(), Type.Null()]),
            board: BoardDto(),
            author: UserDto(),
        }),
    ]);
}

export interface BoardViewCardDto
    extends Static<ReturnType<typeof BoardViewCardDto>> {}

export async function toBoardViewCardDto(
    tx: DataTx,
    cardId: CardId
): Promise<BoardViewCardDto> {
    const card = await tx.cards.getById(cardId, {includeDeleted: true});
    assert(card !== undefined, `toBoardViewCardDto: card not found: ${cardId}`);
    const column = card.columnId ? await toColumnDto(tx, card.columnId) : null;
    const board = await toBoardDto(tx, card.boardId);
    const author = await toUserDto(tx, card.authorId);

    return {...card, column, board, author};
}

export function ColumnDto() {
    return Type.Composite([
        Column(),
        Type.Object({
            state: CrdtDiff<Column>(),
            board: BoardDto(),
        }),
    ]);
}

export interface ColumnDto extends Static<ReturnType<typeof ColumnDto>> {}

export async function toColumnDto(
    tx: DataTx,
    columnId: ColumnId
): Promise<ColumnDto> {
    const column = await tx.columns.getById(columnId, {includeDeleted: true});
    assert(column !== undefined, `toColumnDto: column not found: ${columnId}`);
    const board = await toBoardDto(tx, column.boardId);

    return {...column, board};
}

export function BoardDto() {
    return Type.Composite([
        Board(),
        Type.Object({
            state: CrdtDiff<Board>(),
        }),
    ]);
}

export interface BoardDto extends Static<ReturnType<typeof BoardDto>> {}

export async function toBoardDto(
    tx: DataTx,
    boardId: BoardId
): Promise<BoardDto> {
    const board = await tx.boards.getById(boardId, {includeDeleted: true});
    assert(board !== undefined, `toBoardDto: board not found: ${boardId}`);

    return {...board};
}

export function MemberDto() {
    return Type.Composite([
        Member(),
        Type.Object({
            state: CrdtDiff<Member>(),
            user: UserDto(),
            board: BoardDto(),
        }),
    ]);
}

export interface MemberDto extends Static<ReturnType<typeof MemberDto>> {}

export async function toMemberDto(
    tx: DataTx,
    memberId: MemberId
): Promise<MemberDto> {
    const member = await tx.members.getById(memberId, {includeDeleted: true});
    assert(member !== undefined, `toMemberDto: member not found: ${memberId}`);
    const user = await toUserDto(tx, member.userId);
    const board = await toBoardDto(tx, member.boardId);

    return {...member, user, board};
}

export function MemberAdminDto() {
    return Type.Composite([
        Member(),
        Type.Object({
            user: UserDto(),
            board: BoardDto(),
            account: Type.Optional(AccountDto()),
        }),
    ]);
}

export interface MemberAdminDto
    extends Static<ReturnType<typeof MemberAdminDto>> {}

export async function toMemberAdminDto(
    tx: DataTx,
    memberId: MemberId
): Promise<MemberAdminDto> {
    const member = await tx.members.getById(memberId, {includeDeleted: true});
    assert(member !== undefined, `toMemberDto: member not found: ${memberId}`);
    const user = await toUserDto(tx, member.userId);
    const board = await toBoardDto(tx, member.boardId);
    const account = await tx.accounts.getByUserId(member.userId);

    return {
        ...member,
        user,
        board,
        account: account ? await toAccountDto(tx, account.id) : undefined,
    };
}

export function UserDto() {
    return Type.Composite([
        User(),
        Type.Object({
            state: CrdtDiff<User>(),
        }),
    ]);
}

export interface UserDto extends Static<ReturnType<typeof UserDto>> {}

export async function toUserDto(tx: DataTx, userId: UserId): Promise<UserDto> {
    const user = await tx.users.getById(userId, {includeDeleted: true});
    assert(user !== undefined, `toUserDto: user not found: ${userId}`);

    return user;
}

export function AccountDto() {
    return Type.Composite([
        Account(),
        Type.Object({
            user: UserDto(),
        }),
    ]);
}

export interface AccountDto extends Static<ReturnType<typeof AccountDto>> {}

export async function toAccountDto(
    tx: DataTx,
    accountId: AccountId
): Promise<AccountDto> {
    const account = await tx.accounts.getById(accountId);
    assert(
        account !== undefined,
        `toAccountDto: account not found: ${accountId}`
    );
    const user = await toUserDto(tx, account.userId);

    return {...account, user};
}

export function AttachmentDto() {
    return Attachment();
}

export interface AttachmentDto
    extends Static<ReturnType<typeof AttachmentDto>> {}

export async function toAttachmentDto(
    tx: DataTx,
    attachmentId: AttachmentId
): Promise<AttachmentDto> {
    const attachment = await tx.attachments.getById(attachmentId, {
        includeDeleted: true,
    });
    assert(
        attachment !== undefined,
        `toAttachmentDto: attachment not found: ${attachmentId}`
    );

    return attachment;
}

export function MessageWithoutReplyDto() {
    return Type.Composite([
        Message(),
        Type.Object({
            state: CrdtDiff<Message>(),
            author: UserDto(),
            card: CardDto(),
            attachments: Type.Array(AttachmentDto()),
        }),
    ]);
}

export interface MessageWithoutReplyDto
    extends Static<ReturnType<typeof MessageWithoutReplyDto>> {}

export async function toMessageWithoutReplyDto(
    tx: DataTx,
    messageId: MessageId
): Promise<MessageWithoutReplyDto> {
    const message = await tx.messages.getById(messageId, {
        includeDeleted: true,
    });
    assert(
        message !== undefined,
        `toMessageDto: message not found: ${messageId}`
    );
    const author = await toUserDto(tx, message.authorId);
    const card = await toCardDto(tx, message.cardId);
    const attachments = await whenAll(
        message.attachmentIds.map(x => toAttachmentDto(tx, x))
    );

    return {...message, author, card, attachments};
}

export function MessageDto() {
    return Type.Composite([
        MessageWithoutReplyDto(),
        Type.Object({
            replyTo: Type.Optional(MessageWithoutReplyDto()),
        }),
    ]);
}

export interface MessageDto extends Static<ReturnType<typeof MessageDto>> {}

export async function toMessageDto(
    tx: DataTx,
    messageId: MessageId
): Promise<MessageDto> {
    const dto = await toMessageWithoutReplyDto(tx, messageId);
    const replyTo = dto.replyToId
        ? await toMessageWithoutReplyDto(tx, dto.replyToId)
        : undefined;

    return {...dto, replyTo};
}

export function MeDto() {
    return Type.Object({
        user: UserDto(),
        account: Account(),
    });
}

export interface MeDto extends Static<ReturnType<typeof MeDto>> {}

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
            key: Type.String(),
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
