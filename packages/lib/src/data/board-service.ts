import {getAccount} from '../coordinator/auth-api.js';
import {getNow} from '../timestamp.js';
import {whenAll} from '../utils.js';
import type {EmailService} from './email-service.js';
import type {CryptoProvider} from './infrastructure.js';
import {createJoinCode} from './join-code.js';
import type {AccountRepo} from './repos/account-repo.js';
import {
    createBoardId,
    type Board,
    type BoardId,
    type BoardRepo,
} from './repos/board-repo.js';
import {createMemberId, MemberRepo} from './repos/member-repo.js';
import type {UserId, UserRepo} from './repos/user-repo.js';

export class BoardService {
    private readonly boards: BoardRepo;
    private readonly members: MemberRepo;
    private readonly accounts: AccountRepo;
    private readonly users: UserRepo;
    private readonly crypto: CryptoProvider;
    private readonly emailService: EmailService;

    constructor(params: {
        boards: BoardRepo;
        members: MemberRepo;
        accounts: AccountRepo;
        users: UserRepo;
        crypto: CryptoProvider;
        emailService: EmailService;
    }) {
        this.boards = params.boards;
        this.members = params.members;
        this.accounts = params.accounts;
        this.users = params.users;
        this.crypto = params.crypto;
        this.emailService = params.emailService;
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
            joinCode: await createJoinCode(this.crypto),
            joinRole: 'admin',
        });

        await whenAll([
            this.members.create({
                id: createMemberId(),
                boardId: board.id,
                createdAt: now,
                updatedAt: now,
                userId: params.authorId,
                role: 'owner',
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
                    position: Math.random(),
                    role: 'writer',
                    updatedAt: now,
                    userId: account.userId,
                });

                this.emailService.scheduleInviteEmail({
                    email: member,
                    boardName: params.name,
                    boardKey: params.key,
                });
            }),
        ]);

        return board;
    }
}
