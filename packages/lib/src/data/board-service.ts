import {getAccount} from '../coordinator/auth-api.js';
import {createRichtext} from '../crdt/richtext.js';
import {htmlToYFragment} from '../richtext.js';
import {getNow, Timestamp} from '../timestamp.js';
import {whenAll} from '../utils.js';
import type {EmailService} from './email-service.js';
import type {CryptoProvider} from './infrastructure.js';
import {createJoinCode} from './join-code.js';
import type {Account, AccountRepo} from './repos/account-repo.js';
import {
    createBoardId,
    type Board,
    type BoardId,
    type BoardRepo,
} from './repos/board-repo.js';
import {createCardId, type CardRepo} from './repos/card-repo.js';
import {
    createColumnId,
    type ColumnId,
    type ColumnRepo,
} from './repos/column-repo.js';
import {createMemberId, MemberRepo} from './repos/member-repo.js';
import {createMessageId, type MessageRepo} from './repos/message-repo.js';
import type {UserId, UserRepo} from './repos/user-repo.js';
import type {BoardTemplate, CardTemplate} from './template.js';

export class BoardService {
    private readonly boards: BoardRepo;
    private readonly members: MemberRepo;
    private readonly accounts: AccountRepo;
    private readonly users: UserRepo;
    private readonly crypto: CryptoProvider;
    private readonly emailService: EmailService;
    private readonly columns: ColumnRepo;
    private readonly cards: CardRepo;
    private readonly messages: MessageRepo;
    private readonly timestamp: Timestamp;

    constructor(params: {
        boards: BoardRepo;
        members: MemberRepo;
        accounts: AccountRepo;
        users: UserRepo;
        crypto: CryptoProvider;
        emailService: EmailService;
        columns: ColumnRepo;
        cards: CardRepo;
        messages: MessageRepo;
        timestamp: Timestamp;
    }) {
        this.boards = params.boards;
        this.members = params.members;
        this.accounts = params.accounts;
        this.users = params.users;
        this.crypto = params.crypto;
        this.emailService = params.emailService;
        this.columns = params.columns;
        this.cards = params.cards;
        this.messages = params.messages;
        this.timestamp = params.timestamp;
    }

    async createBoard(params: {
        authorId: UserId;
        name: string;
        key: string;
        members: string[];
        template: BoardTemplate;
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
            this.initBoard(board, params.template),
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

    private async initBoard(board: Board, template: BoardTemplate) {
        const onboardGuide = await getAccount({
            accounts: this.accounts,
            boardService: this,
            crypto: this.crypto,
            email: 'bot@syncwave.dev',
            fullName: 'Syncwave',
            users: this.users,
            skipBoardCreation: true,
        });

        await this.members.create({
            id: createMemberId(),
            boardId: board.id,
            createdAt: this.timestamp,
            updatedAt: this.timestamp,
            userId: onboardGuide.userId,
            role: 'writer',
            position: Math.random(),
        });

        await whenAll(
            template.columns.map(async (column, idx) => {
                const columnId = createColumnId();
                await this.columns.create({
                    authorId: onboardGuide.userId,
                    boardId: board.id,
                    id: columnId,
                    name: column.name,
                    position: idx,
                    updatedAt: this.timestamp,
                    createdAt: this.timestamp,
                });

                await whenAll(
                    column.cards.map(async (card, cardIdx) => {
                        await this.createCard({
                            onboardGuide,
                            board,
                            columnId,
                            card,
                            cardIndex: cardIdx,
                        });
                    })
                );
            })
        );
    }

    private async createCard(params: {
        onboardGuide: Account;
        board: Board;
        columnId: ColumnId;
        card: CardTemplate;
        cardIndex: number;
    }) {
        const cardId = createCardId();
        await this.cards.create({
            authorId: params.onboardGuide.userId,
            boardId: params.board.id,
            columnId: params.columnId,
            createdAt: this.timestamp,
            text: createRichtext(htmlToYFragment(params.card.html)),
            id: cardId,
            counter: await this.boards.incrementBoardCounter(params.board.id),
            position: params.cardIndex,
            updatedAt: this.timestamp,
        });

        await this.messages.create({
            id: createMessageId(),
            attachmentIds: [],
            authorId: params.onboardGuide.userId,
            boardId: params.board.id,
            cardId,
            columnId: params.columnId,
            createdAt: this.timestamp,
            updatedAt: this.timestamp,
            payload: {
                type: 'card_created',
                cardCreatedAt: this.timestamp,
                cardId,
            },
            replyToId: undefined,
            target: 'card',
        });

        for (const [messageIdx, message] of params.card.messages.entries()) {
            await this.messages.create({
                authorId: params.onboardGuide.userId,
                boardId: params.board.id,
                cardId,
                columnId: params.columnId,
                createdAt: this.timestamp,
                id: createMessageId(),
                updatedAt: (this.timestamp + messageIdx + 1) as Timestamp,
                attachmentIds: [],
                payload: {
                    type: 'text',
                    text: createRichtext(htmlToYFragment(message.html)),
                },
                replyToId: undefined,
                target: 'card',
            });
        }
    }
}
