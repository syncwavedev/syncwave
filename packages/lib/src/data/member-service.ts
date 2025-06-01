import {BusinessError} from '../errors.js';
import {getNow} from '../timestamp.js';
import type {Principal} from './auth.js';
import type {EmailService} from './email-service.js';
import {canManageRole, type PermissionService} from './permission-service.js';
import type {Account} from './repos/account-repo.js';
import type {BoardId, BoardRepo} from './repos/board-repo.js';
import {
    createMemberId,
    MemberRole,
    type Member,
    type MemberRepo,
} from './repos/member-repo.js';

export class MemberService {
    constructor(
        private readonly members: MemberRepo,
        private readonly boards: BoardRepo,
        private readonly permissionService: PermissionService,
        private readonly emailService: EmailService,
        private readonly principal: Principal
    ) {}

    async addMember(params: {
        account: Account;
        boardId: BoardId;
        role: MemberRole;
        uiUrl: string;
        checkPermission: boolean;
    }) {
        const board = await this.boards.getById(params.boardId);
        if (!board) {
            throw new BusinessError(
                `board with id ${params.boardId} not found`,
                'board_not_found'
            );
        }

        const existingMember = await this.members.getByUserIdAndBoardId(
            params.account.userId,
            params.boardId,
            {excludeDeleted: false}
        );

        const now = getNow();

        let member: Member;
        if (existingMember) {
            if (
                existingMember?.deletedAt ||
                !canManageRole(existingMember.role, params.role)
            ) {
                if (params.checkPermission) {
                    await this.permissionService.ensureCanManage(
                        existingMember.boardId,
                        existingMember.role
                    );
                }
                member = await this.members.update(
                    existingMember.id,
                    {excludeDeleted: false},
                    x => {
                        if (x.deletedAt) {
                            x.deletedAt = undefined;
                        }
                        if (!canManageRole(existingMember.role, params.role)) {
                            x.role = params.role;
                        }
                    }
                );
            } else {
                member = existingMember;
            }
        } else {
            console.log('more');
            member = await this.members.create({
                id: createMemberId(),
                boardId: params.boardId,
                userId: params.account.userId,
                createdAt: now,
                updatedAt: now,
                role: params.role,
                position: Math.random(),
            });
        }

        if (this.principal.userId !== params.account.userId) {
            this.emailService.scheduleInviteEmail({
                email: params.account.email,
                boardName: board.name,
                boardKey: board.key,
                uiUrl: params.uiUrl,
            });
        }

        return member;
    }
}
