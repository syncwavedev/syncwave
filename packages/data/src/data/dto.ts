import {z} from 'zod';
import {zCrdtDiffString} from '../crdt/crdt.js';
import {assert} from '../utils.js';
import {DataTx} from './data-layer.js';
import {Board, BoardId, zBoard} from './repos/board-repo.js';
import {Column, ColumnId, zColumn} from './repos/column-repo.js';
import {CommentId, zComment} from './repos/comment-repo.js';
import {IdentityId, zIdentity} from './repos/identity-repo.js';
import {MemberId, zMember} from './repos/member-repo.js';
import {Task, TaskId, zTask} from './repos/task-repo.js';
import {User, UserId, zUser} from './repos/user-repo.js';

export function zTaskDto() {
    return zTask().extend({
        column: zColumnDto().nullable(),
        board: zBoardDto(),
        state: zCrdtDiffString<Task>(),
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

export function zBoardViewTaskDto() {
    return zTask().extend({
        column: zColumnDto().nullable(),
        board: zBoardDto(),
        state: zCrdtDiffString<Task>(),
    });
}

export type BoardViewTaskDto = z.infer<ReturnType<typeof zBoardViewTaskDto>>;

export async function toBoardViewTaskDto(
    tx: DataTx,
    taskId: TaskId
): Promise<BoardViewTaskDto> {
    const task = await tx.tasks.getById(taskId, true);
    assert(task !== undefined, `toBoardViewTaskDto: task not found: ${taskId}`);
    const column = task.columnId ? await toColumnDto(tx, task.columnId) : null;
    const board = await toBoardDto(tx, task.boardId);

    return {...task, column, board};
}

export function zColumnDto() {
    return zColumn().extend({
        board: zBoardDto(),
        state: zCrdtDiffString<Column>(),
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
        tasks: z.array(zBoardViewTaskDto()),
        state: zCrdtDiffString<Column>(),
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
    const tasks = await tx.tasks
        .getByColumnId(column.id)
        .mapParallel(x => toBoardViewTaskDto(tx, x.id))
        .toArray();

    return {...column, tasks};
}

export function zBoardDto() {
    return zBoard().extend({
        state: zCrdtDiffString<Board>(),
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
        state: zCrdtDiffString<Board>(),
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
        state: zCrdtDiffString<User>(),
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
