import {BusinessError} from '../errors.js';
import type {Principal} from './auth.js';
import type {DataTx} from './data-layer.js';
import type {AttachmentId} from './repos/attachment-repo.js';
import type {BoardId} from './repos/board-repo.js';
import type {CardId} from './repos/card-repo.js';
import type {ColumnId} from './repos/column-repo.js';
import {
    type Member,
    type MemberId,
    type MemberRole,
    ROLE_ORDER,
} from './repos/member-repo.js';
import type {MessageId} from './repos/message-repo.js';
import type {UserId} from './repos/user-repo.js';

export function canManageRole(managerRole: MemberRole, role: MemberRole) {
    const adminOrOwner: MemberRole[] = ['owner', 'admin'];

    const minimumRequiredRole = adminOrOwner.includes(role) ? 'owner' : role;
    return ROLE_ORDER[managerRole] >= ROLE_ORDER[minimumRequiredRole];
}

export class PermissionService {
    constructor(
        private readonly auth: Principal,
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
            boardId,
            {excludeDeleted: true}
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
        const column = await this.tx().columns.getById(columnId);

        if (!column) {
            throw new BusinessError(
                `column ${columnId} doesn't exist`,
                'column_not_found'
            );
        }
        return await this.ensureBoardMember(column.boardId, minimum);
    }

    async ensureAttachmentMember(
        attachmentId: AttachmentId,
        minimum: MemberRole
    ): Promise<Member> {
        const attachment = await this.tx().attachments.getById(attachmentId);

        if (!attachment) {
            throw new BusinessError(
                `attachment ${attachmentId} doesn't exist`,
                'attachment_not_found'
            );
        }
        return await this.ensureBoardMember(attachment.boardId, minimum);
    }

    async ensureCardMember(
        cardId: CardId,
        minimum: MemberRole
    ): Promise<Member> {
        const card = await this.tx().cards.getById(cardId);

        if (!card) {
            throw new BusinessError(
                `card ${cardId} doesn't exist`,
                'card_not_found'
            );
        }
        return await this.ensureBoardMember(card.boardId, minimum);
    }

    async ensureMember(memberId: MemberId): Promise<Member> {
        const member = await this.tx().members.getById(memberId, {
            excludeDeleted: true,
        });

        if (!member) {
            throw new BusinessError(
                `member ${memberId} doesn't exist`,
                'member_not_found'
            );
        }

        await this.ensureUser(member.userId);

        return member;
    }

    async ensureMessageMember(
        messageId: MessageId,
        minimum: MemberRole
    ): Promise<Member> {
        const message = await this.tx().messages.getById(messageId);

        if (!message) {
            throw new BusinessError(
                `message ${messageId} doesn't exist`,
                'message_not_found'
            );
        }
        const card = await this.tx().cards.getById(message.cardId);
        if (!card) {
            throw new BusinessError(
                `card ${message.cardId} doesn't exist`,
                'card_not_found'
            );
        }
        return await this.ensureBoardMember(card.boardId, minimum);
    }
}
