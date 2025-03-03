import {BusinessError} from '../errors.js';
import type {AuthContext} from './auth-context.js';
import type {DataTx} from './data-layer.js';
import type {BoardId} from './repos/board-repo.js';
import type {CardId} from './repos/card-repo.js';
import type {ColumnId} from './repos/column-repo.js';
import type {CommentId} from './repos/comment-repo.js';
import {
    type Member,
    type MemberId,
    type MemberRole,
    ROLE_ORDER,
} from './repos/member-repo.js';
import type {UserId} from './repos/user-repo.js';

export function canManageRole(managerRole: MemberRole, role: MemberRole) {
    const adminOrOwner: MemberRole[] = ['owner', 'admin'];

    const minimumRequiredRole = adminOrOwner.includes(role) ? 'owner' : 'admin';
    return ROLE_ORDER[managerRole] >= ROLE_ORDER[minimumRequiredRole];
}

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

        if (!canManageRole(member.role, minimum)) {
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

    async ensureCardMember(
        cardId: CardId,
        minimum: MemberRole
    ): Promise<Member> {
        const card = await this.tx().cards.getById(cardId, true);

        if (!card) {
            throw new BusinessError(
                `card ${cardId} doesn't exist`,
                'card_not_found'
            );
        }
        return await this.ensureBoardMember(card.boardId, minimum);
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
        const card = await this.tx().cards.getById(comment.cardId, true);
        if (!card) {
            throw new BusinessError(
                `card ${comment.cardId} doesn't exist`,
                'card_not_found'
            );
        }
        return await this.ensureBoardMember(card.boardId, minimum);
    }
}
