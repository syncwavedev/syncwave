import {type Static, Type} from '@sinclair/typebox';
import {zCrdtDiff} from '../crdt/crdt.js';
import {assert, whenAll} from '../utils.js';
import {Uuid} from '../uuid.js';
import {type DataTx} from './data-layer.js';
import {type Account, type AccountId, zAccount} from './repos/account-repo.js';
import {type AttachmentId, zAttachment} from './repos/attachment-repo.js';
import {type Board, type BoardId, zBoard} from './repos/board-repo.js';
import {type Card, type CardId, zCard} from './repos/card-repo.js';
import {type Column, type ColumnId, zColumn} from './repos/column-repo.js';
import {type Member, type MemberId, zMember} from './repos/member-repo.js';
import {type Message, type MessageId, zMessage} from './repos/message-repo.js';
import {type User, type UserId, zUser} from './repos/user-repo.js';

export function zCardDto() {
    return Type.Composite([
        zCard(),
        Type.Object({
            column: Type.Union([zColumnDto(), Type.Null()]),
            author: zUserDto(),
            board: zBoardDto(),
            assignee: Type.Union([zUserDto(), Type.Null()]),
            state: zCrdtDiff<Card>(),
        }),
    ]);
}

export interface CardDto extends Static<ReturnType<typeof zCardDto>> {}

export async function toCardDto(tx: DataTx, cardId: CardId): Promise<CardDto> {
    const card = await tx.cards.getById(cardId, true);
    assert(card !== undefined, `toCardDto: card not found: ${cardId}`);
    const column = card.columnId ? await toColumnDto(tx, card.columnId) : null;
    const author = await toUserDto(tx, card.authorId);
    const board = await toBoardDto(tx, card.boardId);
    const assignee = card.assigneeId
        ? await toUserDto(tx, card.assigneeId)
        : null;

    return {...card, column, board, author, assignee};
}

export function zCardViewDto() {
    return Type.Composite([
        zCardDto(),
        Type.Object({
            messages: Type.Array(zMessageDto()),
        }),
    ]);
}

export interface CardViewDto extends Static<ReturnType<typeof zCardViewDto>> {}

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

export function zBoardViewCardDto() {
    return Type.Composite([
        zCard(),
        Type.Object({
            state: zCrdtDiff<Card>(),
            column: Type.Union([zColumnDto(), Type.Null()]),
            board: zBoardDto(),
            author: zUserDto(),
        }),
    ]);
}

export interface BoardViewCardDto
    extends Static<ReturnType<typeof zBoardViewCardDto>> {}

export async function toBoardViewCardDto(
    tx: DataTx,
    cardId: CardId
): Promise<BoardViewCardDto> {
    const card = await tx.cards.getById(cardId, true);
    assert(card !== undefined, `toBoardViewCardDto: card not found: ${cardId}`);
    const column = card.columnId ? await toColumnDto(tx, card.columnId) : null;
    const board = await toBoardDto(tx, card.boardId);
    const author = await toUserDto(tx, card.authorId);

    return {...card, column, board, author};
}

export function zColumnDto() {
    return Type.Composite([
        zColumn(),
        Type.Object({
            state: zCrdtDiff<Column>(),
            board: zBoardDto(),
        }),
    ]);
}

export interface ColumnDto extends Static<ReturnType<typeof zColumnDto>> {}

export async function toColumnDto(
    tx: DataTx,
    columnId: ColumnId
): Promise<ColumnDto> {
    const column = await tx.columns.getById(columnId, true);
    assert(column !== undefined, `toColumnDto: column not found: ${columnId}`);
    const board = await toBoardDto(tx, column.boardId);

    return {...column, board};
}

export function zBoardDto() {
    return Type.Composite([
        zBoard(),
        Type.Object({
            state: zCrdtDiff<Board>(),
        }),
    ]);
}

export interface BoardDto extends Static<ReturnType<typeof zBoardDto>> {}

export async function toBoardDto(
    tx: DataTx,
    boardId: BoardId
): Promise<BoardDto> {
    const board = await tx.boards.getById(boardId, true);
    assert(board !== undefined, `toBoardDto: board not found: ${boardId}`);

    return {...board};
}

export function zMemberDto() {
    return Type.Composite([
        zMember(),
        Type.Object({
            state: zCrdtDiff<Member>(),
            user: zUserDto(),
            board: zBoardDto(),
        }),
    ]);
}

export interface MemberDto extends Static<ReturnType<typeof zMemberDto>> {}

export async function toMemberDto(
    tx: DataTx,
    memberId: MemberId
): Promise<MemberDto> {
    const member = await tx.members.getById(memberId, true);
    assert(member !== undefined, `toMemberDto: member not found: ${memberId}`);
    const user = await toUserDto(tx, member.userId);
    const board = await toBoardDto(tx, member.boardId);

    return {...member, user, board};
}

export function zMemberAdminDto() {
    return Type.Composite([
        zMember(),
        Type.Object({
            user: zUserDto(),
            board: zBoardDto(),
            account: Type.Optional(zAccountDto()),
        }),
    ]);
}

export interface MemberAdminDto
    extends Static<ReturnType<typeof zMemberAdminDto>> {}

export async function toMemberAdminDto(
    tx: DataTx,
    memberId: MemberId
): Promise<MemberAdminDto> {
    const member = await tx.members.getById(memberId, true);
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

export function zUserDto() {
    return Type.Composite([
        zUser(),
        Type.Object({
            state: zCrdtDiff<User>(),
        }),
    ]);
}

export interface UserDto extends Static<ReturnType<typeof zUserDto>> {}

export async function toUserDto(tx: DataTx, userId: UserId): Promise<UserDto> {
    const user = await tx.users.getById(userId, true);
    assert(user !== undefined, `toUserDto: user not found: ${userId}`);

    return user;
}

export function zAccountDto() {
    return Type.Composite([
        zAccount(),
        Type.Object({
            zUser: zUserDto(),
        }),
    ]);
}

export interface AccountDto extends Static<ReturnType<typeof zAccountDto>> {}

export async function toAccountDto(
    tx: DataTx,
    accountId: AccountId
): Promise<AccountDto> {
    const account = await tx.accounts.getById(accountId);
    assert(
        account !== undefined,
        `toAccountDto: account not found: ${accountId}`
    );
    const zUser = await toUserDto(tx, account.userId);

    return {...account, zUser};
}

export function zAttachmentDto() {
    return zAttachment();
}

export interface AttachmentDto
    extends Static<ReturnType<typeof zAttachmentDto>> {}

export async function toAttachmentDto(
    tx: DataTx,
    attachmentId: AttachmentId
): Promise<AttachmentDto> {
    const attachment = await tx.attachments.getById(attachmentId, true);
    assert(
        attachment !== undefined,
        `toAttachmentDto: attachment not found: ${attachmentId}`
    );

    return attachment;
}

export function zMessageWithoutReplyDto() {
    return Type.Composite([
        zMessage(),
        Type.Object({
            state: zCrdtDiff<Message>(),
            author: zUserDto(),
            card: zCardDto(),
            attachments: Type.Array(zAttachmentDto()),
        }),
    ]);
}

export interface MessageWithoutReplyDto
    extends Static<ReturnType<typeof zMessageWithoutReplyDto>> {}

export async function toMessageWithoutReplyDto(
    tx: DataTx,
    messageId: MessageId
): Promise<MessageWithoutReplyDto> {
    const message = await tx.messages.getById(messageId, true);
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

export function zMessageDto() {
    return Type.Composite([
        zMessageWithoutReplyDto(),
        Type.Object({
            replyTo: Type.Optional(zMessageWithoutReplyDto()),
        }),
    ]);
}

export interface MessageDto extends Static<ReturnType<typeof zMessageDto>> {}

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

export function zMeDto() {
    return Type.Object({
        user: zUserDto(),
        account: zAccount(),
    });
}

export interface MeDto extends Static<ReturnType<typeof zMeDto>> {}

export function zMeViewDataDto() {
    return Type.Object({
        profile: Type.Object({
            id: Uuid<UserId>(),
            state: zCrdtDiff<User>(),
        }),
        account: Type.Object({
            id: Uuid<AccountId>(),
            state: zCrdtDiff<Account>(),
        }),
        boards: Type.Array(
            Type.Object({
                id: Uuid<BoardId>(),
                state: zCrdtDiff<Board>(),
            })
        ),
    });
}

export interface MeViewDataDto
    extends Static<ReturnType<typeof zMeViewDataDto>> {}

export function zBoardViewDataDto() {
    return Type.Object({
        board: Type.Object({
            state: zCrdtDiff<Board>(),
            key: Type.String(),
            id: Uuid<BoardId>(),
        }),
        columns: Type.Array(
            Type.Object({state: zCrdtDiff<Column>(), id: Uuid<ColumnId>()})
        ),
        cards: Type.Array(
            Type.Object({state: zCrdtDiff<Card>(), id: Uuid<CardId>()})
        ),
        users: Type.Array(
            Type.Object({state: zCrdtDiff<User>(), id: Uuid<UserId>()})
        ),
    });
}

export interface BoardViewDataDto
    extends Static<ReturnType<typeof zBoardViewDataDto>> {}

export function zUserDataDto() {
    return Type.Object({
        user: Type.Object({state: zCrdtDiff<User>(), id: Uuid<UserId>()}),
    });
}

export interface UserDataDto extends Static<ReturnType<typeof zUserDataDto>> {}
