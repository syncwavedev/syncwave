import {BusinessError} from '../errors.js';
import type {AuthContext} from './auth-context.js';
import type {DataTx} from './data-layer.js';
import type {BoardId} from './repos/board-repo.js';
import type {ColumnId} from './repos/column-repo.js';
import type {CommentId} from './repos/comment-repo.js';
import {
    type Member,
    type MemberId,
    type MemberRole,
    ROLE_ORDER,
} from './repos/member-repo.js';
import type {TaskId} from './repos/task-repo.js';
import type {UserId} from './repos/user-repo.js';

export class PermissionService {
    constructor(
        private readonly auth: AuthContext,
        private readonly tx: () => DataTx
    ) {}

    ensureAuthenticated(): UserId {
        if (this.auth.userId === undefined) {
            throw new BusinessError(
                'user is not authenticated',
                'not_authenticated'
            );
        }

        return this.auth.userId;
    }

    async ensureCanManage(boardId: BoardId, role: MemberRole) {
        const adminOrOwner: MemberRole[] = ['owner', 'admin'];
        return await this.ensureBoardMember(
            boardId,
            adminOrOwner.includes(role) ? 'owner' : 'admin'
        );
    }

    async ensureUser(userId: UserId) {
        if (this.ensureAuthenticated() !== userId) {
            throw new BusinessError(
                'user is not authorized to perform this action',
                'forbidden'
            );
        }
    }

    async ensureBoardMember(
        boardId: BoardId,
        minimum: MemberRole
    ): Promise<Member> {
        const meId = this.ensureAuthenticated();
        const member = await this.tx().members.getByUserIdAndBoardId(
            meId,
            boardId
        );
        if (!member) {
            throw new BusinessError(
                `user ${meId} is not a member of the board ${boardId}`,
                'forbidden'
            );
        }

        if (ROLE_ORDER[member.role] < ROLE_ORDER[minimum]) {
            throw new BusinessError(
                `user ${meId} is not a ${minimum} of the board ${boardId}`,
                'forbidden'
            );
        }

        return member;
    }

    async ensureColumnMember(
        columnId: ColumnId,
        minimum: MemberRole
    ): Promise<Member> {
        const column = await this.tx().columns.getById(columnId, true);

        if (!column) {
            throw new BusinessError(
                `column ${columnId} doesn't exist`,
                'column_not_found'
            );
        }
        return await this.ensureBoardMember(column.boardId, minimum);
    }

    async ensureTaskMember(
        taskId: TaskId,
        minimum: MemberRole
    ): Promise<Member> {
        const task = await this.tx().tasks.getById(taskId, true);

        if (!task) {
            throw new BusinessError(
                `task ${taskId} doesn't exist`,
                'task_not_found'
            );
        }
        return await this.ensureBoardMember(task.boardId, minimum);
    }

    async ensureMember(memberId: MemberId): Promise<Member> {
        const member = await this.tx().members.getById(memberId, true);

        if (!member) {
            throw new BusinessError(
                `member ${memberId} doesn't exist`,
                'member_not_found'
            );
        }

        await this.ensureUser(member.userId);

        return member;
    }

    async ensureCommentMember(
        commentId: CommentId,
        minimum: MemberRole
    ): Promise<Member> {
        const comment = await this.tx().comments.getById(commentId, true);

        if (!comment) {
            throw new BusinessError(
                `comment ${commentId} doesn't exist`,
                'comment_not_found'
            );
        }
        const task = await this.tx().tasks.getById(comment.taskId, true);
        if (!task) {
            throw new BusinessError(
                `task ${comment.taskId} doesn't exist`,
                'task_not_found'
            );
        }
        return await this.ensureBoardMember(task.boardId, minimum);
    }
}
