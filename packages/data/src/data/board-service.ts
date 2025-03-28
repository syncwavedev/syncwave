import {getIdentity} from '../coordinator/auth-api.js';
import {getNow} from '../timestamp.js';
import {whenAll} from '../utils.js';
import type {CryptoService} from './infrastructure.js';
import {
    createBoardId,
    type Board,
    type BoardId,
    type BoardRepo,
} from './repos/board-repo.js';
import type {IdentityRepo} from './repos/identity-repo.js';
import {createMemberId, MemberRepo} from './repos/member-repo.js';
import type {UserId, UserRepo} from './repos/user-repo.js';

export class BoardService {
    private readonly boards: BoardRepo;
    private readonly members: MemberRepo;
    private readonly identities: IdentityRepo;
    private readonly users: UserRepo;
    private readonly crypto: CryptoService;

    constructor(params: {
        boards: BoardRepo;
        members: MemberRepo;
        identities: IdentityRepo;
        users: UserRepo;
        crypto: CryptoService;
    }) {
        this.boards = params.boards;
        this.members = params.members;
        this.identities = params.identities;
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
            deleted: false,
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
                deleted: false,
                role: 'owner',
                // todo: add to the beginning of the user list
                position: Math.random(),
                version: '2',
            }),
            ...params.members.map(async member => {
                const identity = await getIdentity({
                    identities: this.identities,
                    crypto: this.crypto,
                    email: member,
                    fullName: undefined,
                    users: this.users,
                    boardService: this,
                });

                // user is trying to add themselves as a member
                if (identity.userId === params.authorId) {
                    return;
                }

                await this.members.create({
                    boardId: board.id,
                    createdAt: now,
                    deleted: false,
                    id: createMemberId(),
                    position: Math.random(),
                    role: 'writer',
                    updatedAt: now,
                    userId: identity.userId,
                    version: '2',
                });
            }),
        ]);

        return board;
    }
}
