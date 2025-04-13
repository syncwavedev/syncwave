import {getAccount} from '../coordinator/auth-api.js';
import {addYears, getNow} from '../timestamp.js';
import {whenAll} from '../utils.js';
import type {Config, DataEffectScheduler} from './data-layer.js';
import type {
    CryptoService,
    EmailService,
    JwtService,
} from './infrastructure.js';
import type {AccountRepo} from './repos/account-repo.js';
import {
    createBoardId,
    type Board,
    type BoardId,
    type BoardRepo,
} from './repos/board-repo.js';
import {
    createMemberId,
    MemberRepo,
    type MemberId,
} from './repos/member-repo.js';
import type {UserId, UserRepo} from './repos/user-repo.js';

export class BoardService {
    private readonly boards: BoardRepo;
    private readonly members: MemberRepo;
    private readonly accounts: AccountRepo;
    private readonly users: UserRepo;
    private readonly crypto: CryptoService;
    private readonly email: EmailService;
    private readonly scheduleEffect: DataEffectScheduler;
    private readonly jwtService: JwtService;
    private readonly config: Config;

    constructor(params: {
        boards: BoardRepo;
        members: MemberRepo;
        accounts: AccountRepo;
        users: UserRepo;
        crypto: CryptoService;
        email: EmailService;
        scheduleEffect: DataEffectScheduler;
        jwtService: JwtService;
        config: Config;
    }) {
        this.boards = params.boards;
        this.members = params.members;
        this.accounts = params.accounts;
        this.users = params.users;
        this.crypto = params.crypto;
        this.email = params.email;
        this.scheduleEffect = params.scheduleEffect;
        this.jwtService = params.jwtService;
        this.config = params.config;
    }

    async createBoard(params: {
        authorId: UserId;
        name: string;
        key: string;
        members: string[];
        boardId?: BoardId;
    }): Promise<Board> {
        const now = getNow();
        const board = await this.boards.create({
            id: params.boardId ?? createBoardId(),
            createdAt: now,
            updatedAt: now,
            name: params.name,
            authorId: params.authorId,
            key: params.key.toUpperCase(),
        });

        await whenAll([
            this.members.create({
                id: createMemberId(),
                boardId: board.id,
                createdAt: now,
                updatedAt: now,
                userId: params.authorId,
                role: 'owner',
                inviteAccepted: true,
                position: Math.random(),
            }),
            ...params.members.map(async member => {
                const account = await getAccount({
                    accounts: this.accounts,
                    crypto: this.crypto,
                    email: member,
                    fullName: undefined,
                    users: this.users,
                    boardService: this,
                });

                // user is trying to add themselves as a member
                if (account.userId === params.authorId) {
                    return;
                }

                const memberId = createMemberId();
                await this.members.create({
                    boardId: board.id,
                    createdAt: now,
                    id: memberId,
                    inviteAccepted: false,
                    position: Math.random(),
                    role: 'writer',
                    updatedAt: now,
                    userId: account.userId,
                });

                this.scheduleInviteEmail({
                    email: member,
                    boardName: params.name,
                    memberId,
                });
            }),
        ]);

        return board;
    }

    scheduleInviteEmail(params: {
        email: string;
        boardName: string;
        memberId: MemberId;
    }) {
        this.scheduleEffect(async () => {
            const inviteToken = await this.issueInviteToken({
                memberId: params.memberId,
            });
            const inviteUrl = `${this.config.uiUrl}board-invite/${inviteToken}`;

            const subject = `Invitation to join board ${params.boardName}`;
            await this.email.send({
                recipient: params.email,
                subject,
                // todo: generate capability link
                text: `You have been invited to join the board ${params.boardName} in SyncWave. Click on the link to accept the invitation: ${inviteUrl}`,
                html: `<p>You have been invited to join the board ${params.boardName} in SyncWave. Click on the link to accept the invitation: <a href="${inviteUrl}">${inviteUrl}</a></p>`,
            });
        });
    }

    private async issueInviteToken(params: {
        memberId: MemberId;
    }): Promise<string> {
        const now = getNow();
        const inviteToken = await this.jwtService.sign({
            exp: Math.trunc(addYears(now, 50) / 1000),
            iat: Math.trunc(now / 1000),
            acceptInviteMemberId: params.memberId,
            sub: undefined,
            uid: undefined,
        });

        return inviteToken;
    }
}
