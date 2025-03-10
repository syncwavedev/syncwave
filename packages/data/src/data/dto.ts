import {type Static, Type} from '@sinclair/typebox';
import {zCrdtDiff} from '../crdt/crdt.js';
import {assert, whenAll} from '../utils.js';
import {type DataTx} from './data-layer.js';
import {type AttachmentId, zAttachment} from './repos/attachment-repo.js';
import {type Board, type BoardId, zBoard} from './repos/board-repo.js';
import {type Card, type CardId, zCard} from './repos/card-repo.js';
import {type Column, type ColumnId, zColumn} from './repos/column-repo.js';
import {type IdentityId, zIdentity} from './repos/identity-repo.js';
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

    return {...card, column, board, author};
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
            column: Type.Union([zColumnDto(), Type.Null()]),
            board: zBoardDto(),
            state: zCrdtDiff<Card>(),
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
            board: zBoardDto(),
            state: zCrdtDiff<Column>(),
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

export function zBoardViewColumnDto() {
    return Type.Composite([
        zColumn(),
        Type.Object({
            cards: Type.Array(zBoardViewCardDto()),
            state: zCrdtDiff<Column>(),
        }),
    ]);
}

export interface BoardViewColumnDto
    extends Static<ReturnType<typeof zBoardViewColumnDto>> {}

export async function toBoardViewColumnDto(
    tx: DataTx,
    columnId: ColumnId
): Promise<BoardViewColumnDto> {
    const column = await tx.columns.getById(columnId, true);
    assert(
        column !== undefined,
        `toBoardViewColumnDto: column not found: ${columnId}`
    );
    const cards = await tx.cards
        .getByColumnId(column.id)
        .mapParallel(x => toBoardViewCardDto(tx, x.id))
        .toArray();

    return {...column, cards};
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

export function zBoardViewDto() {
    return Type.Composite([
        zBoard(),
        Type.Object({
            columns: Type.Array(zBoardViewColumnDto()),
            state: zCrdtDiff<Board>(),
        }),
    ]);
}

export interface BoardViewDto
    extends Static<ReturnType<typeof zBoardViewDto>> {}

export async function toBoardViewDto(
    tx: DataTx,
    boardId: BoardId
): Promise<BoardViewDto> {
    const board = await tx.boards.getById(boardId, true);
    assert(board !== undefined, `toBoardViewDto: board not found: ${boardId}`);
    const columns = await tx.columns
        .getByBoardId(boardId)
        .mapParallel(x => toBoardViewColumnDto(tx, x.id))
        .toArray();

    return {...board, columns};
}

export function zMemberDto() {
    return Type.Composite([
        zMember(),
        Type.Object({
            user: zUserDto(),
            board: zBoardDto(),
            state: zCrdtDiff<Member>(),
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
            identity: Type.Optional(zIdentityDto()),
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
    const identity = await tx.identities.getByUserId(member.userId);

    return {
        ...member,
        user,
        board,
        identity: identity ? await toIdentityDto(tx, identity.id) : undefined,
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

export function zIdentityDto() {
    return Type.Composite([
        zIdentity(),
        Type.Object({
            zUser: zUserDto(),
        }),
    ]);
}

export interface IdentityDto extends Static<ReturnType<typeof zIdentityDto>> {}

export async function toIdentityDto(
    tx: DataTx,
    identityId: IdentityId
): Promise<IdentityDto> {
    const identity = await tx.identities.getById(identityId);
    assert(
        identity !== undefined,
        `toIdentityDto: identity not found: ${identityId}`
    );
    const zUser = await toUserDto(tx, identity.userId);

    return {...identity, zUser};
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
            author: zUserDto(),
            card: zCardDto(),
            state: zCrdtDiff<Message>(),
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
        identity: zIdentity(),
    });
}

export interface MeDto extends Static<ReturnType<typeof zMeDto>> {}

export function zBoardViewDtoV2() {
    return Type.Object({
        board: zBoard(),
        columns: Type.Array(zColumn()),
        cards: Type.Array(zCard()),
        users: Type.Array(zUser()),
    });
}

export interface BoardViewDtoV2
    extends Static<ReturnType<typeof zBoardViewDtoV2>> {}
