import {z} from 'zod';
import {assert} from '../utils.js';
import {DataTx} from './data-layer.js';
import {BoardId, zBoard} from './repos/board-repo.js';
import {ColumnId, zColumn} from './repos/column-repo.js';
import {CommentId, zComment} from './repos/comment-repo.js';
import {IdentityId, zIdentity} from './repos/identity-repo.js';
import {MemberId, zMember} from './repos/member-repo.js';
import {TaskId, zTask} from './repos/task-repo.js';
import {UserId, zUser} from './repos/user-repo.js';

export function zTaskDto() {
    return zTask().extend({
        column: zColumnDto().nullable(),
        board: zBoardDto(),
    });
}

export type TaskDto = z.infer<ReturnType<typeof zTaskDto>>;

export async function toTaskDto(tx: DataTx, taskId: TaskId): Promise<TaskDto> {
    const task = await tx.tasks.getById(taskId, true);
    assert(task !== undefined, `toTaskDto: task not found: ${taskId}`);
    const column = task.columnId ? await toColumnDto(tx, task.columnId) : null;
    const board = await toBoardDto(tx, task.boardId);

    return {...task, column, board};
}

export function zColumnDto() {
    return zColumn().extend({
        board: zBoardDto(),
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

export function zBoardDto() {
    return zBoard().extend({
        owner: zUserDto(),
    });
}

export type BoardDto = z.infer<ReturnType<typeof zBoardDto>>;

export async function toBoardDto(
    tx: DataTx,
    boardId: BoardId
): Promise<BoardDto> {
    const board = await tx.boards.getById(boardId, true);
    assert(board !== undefined, `toBoardDto: board not found: ${boardId}`);
    const owner = await toUserDto(tx, board.ownerId);

    return {...board, owner};
}

export function zMemberDto() {
    return zMember().extend({
        user: zUserDto(),
        board: zBoardDto(),
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

export function zUserDto() {
    return zUser().extend({});
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
        task: zTaskDto(),
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
    const task = await toTaskDto(tx, comment.taskId);

    return {...comment, author, task};
}
