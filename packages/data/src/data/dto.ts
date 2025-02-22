import {z} from 'zod';
import {zCrdtDiffBase64} from '../crdt/crdt.js';
import {assert} from '../utils.js';
import {type DataTx} from './data-layer.js';
import {type Board, type BoardId, zBoard} from './repos/board-repo.js';
import {type Card, type CardId, zCard} from './repos/card-repo.js';
import {type Column, type ColumnId, zColumn} from './repos/column-repo.js';
import {type CommentId, zComment} from './repos/comment-repo.js';
import {type IdentityId, zIdentity} from './repos/identity-repo.js';
import {type Member, type MemberId, zMember} from './repos/member-repo.js';
import {type User, type UserId, zUser} from './repos/user-repo.js';

export function zCardDto() {
    return zCard().extend({
        column: zColumnDto().nullable(),
        author: zUserDto(),
        board: zBoardDto(),
        state: zCrdtDiffBase64<Card>(),
    });
}

export type CardDto = z.infer<ReturnType<typeof zCardDto>>;

export async function toCardDto(tx: DataTx, cardId: CardId): Promise<CardDto> {
    const card = await tx.cards.getById(cardId, true);
    assert(card !== undefined, `toCardDto: card not found: ${cardId}`);
    const column = card.columnId ? await toColumnDto(tx, card.columnId) : null;
    const author = await toUserDto(tx, card.authorId);
    const board = await toBoardDto(tx, card.boardId);

    return {...card, column, board, author};
}

export function zBoardViewCardDto() {
    return zCard().extend({
        column: zColumnDto().nullable(),
        board: zBoardDto(),
        state: zCrdtDiffBase64<Card>(),
        author: zUserDto(),
    });
}

export type BoardViewCardDto = z.infer<ReturnType<typeof zBoardViewCardDto>>;

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
    return zColumn().extend({
        board: zBoardDto(),
        state: zCrdtDiffBase64<Column>(),
    });
}

export type ColumnDto = z.infer<ReturnType<typeof zColumnDto>>;

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
    return zColumn().extend({
        cards: z.array(zBoardViewCardDto()),
        state: zCrdtDiffBase64<Column>(),
    });
}

export type BoardViewColumnDto = z.infer<
    ReturnType<typeof zBoardViewColumnDto>
>;

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
    return zBoard().extend({
        state: zCrdtDiffBase64<Board>(),
    });
}

export type BoardDto = z.infer<ReturnType<typeof zBoardDto>>;

export async function toBoardDto(
    tx: DataTx,
    boardId: BoardId
): Promise<BoardDto> {
    const board = await tx.boards.getById(boardId, true);
    assert(board !== undefined, `toBoardDto: board not found: ${boardId}`);

    return {...board};
}

export function zBoardViewDto() {
    return zBoard().extend({
        columns: z.array(zBoardViewColumnDto()),
        state: zCrdtDiffBase64<Board>(),
    });
}

export type BoardViewDto = z.infer<ReturnType<typeof zBoardViewDto>>;

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
    return zMember().extend({
        user: zUserDto(),
        board: zBoardDto(),
        state: zCrdtDiffBase64<Member>(),
    });
}

export type MemberDto = z.infer<ReturnType<typeof zMemberDto>>;

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
    return zMember().extend({
        user: zUserDto(),
        board: zBoardDto(),
        identity: z.union([zIdentityDto(), z.undefined()]),
    });
}

export type MemberAdminDto = z.infer<ReturnType<typeof zMemberAdminDto>>;

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
    return zUser().extend({
        state: zCrdtDiffBase64<User>(),
    });
}

export type UserDto = z.infer<ReturnType<typeof zUserDto>>;

export async function toUserDto(tx: DataTx, userId: UserId): Promise<UserDto> {
    const user = await tx.users.getById(userId, true);
    assert(user !== undefined, `toUserDto: user not found: ${userId}`);

    return user;
}

export function zIdentityDto() {
    return zIdentity().extend({
        zUser: zUserDto(),
    });
}

export type IdentityDto = z.infer<ReturnType<typeof zIdentityDto>>;

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

export function zCommentDto() {
    return zComment().extend({
        author: zUserDto(),
        card: zCardDto(),
    });
}

export type CommentDto = z.infer<ReturnType<typeof zCommentDto>>;

export async function toCommentDto(
    tx: DataTx,
    commentId: CommentId
): Promise<CommentDto> {
    const comment = await tx.comments.getById(commentId, true);
    assert(
        comment !== undefined,
        `toCommentDto: comment not found: ${commentId}`
    );
    const author = await toUserDto(tx, comment.authorId);
    const card = await toCardDto(tx, comment.cardId);

    return {...comment, author, card};
}
