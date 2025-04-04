import {getAccount} from '../coordinator/auth-api.js';
import {getNow} from '../timestamp.js';
import {whenAll} from '../utils.js';
import type {CryptoService} from './infrastructure.js';
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
    private readonly crypto: CryptoService;

    constructor(params: {
        boards: BoardRepo;
        members: MemberRepo;
        accounts: AccountRepo;
        users: UserRepo;
        crypto: CryptoService;
    }) {
        this.boards = params.boards;
        this.members = params.members;
        this.accounts = params.accounts;
        this.users = params.users;
        this.crypto = params.crypto;
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
                // todo: add to the beginning of the user list
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

                await this.members.create({
                    boardId: board.id,
                    createdAt: now,
                    id: createMemberId(),
                    position: Math.random(),
                    role: 'writer',
                    updatedAt: now,
                    userId: account.userId,
                });
            }),
        ]);

        return board;
    }
}
