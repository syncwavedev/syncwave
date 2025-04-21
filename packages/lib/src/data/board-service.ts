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
        members: string[];
        boardId?: BoardId;
    }): Promise<Board> {
        const now = getNow();
        console.log('board name', params.name);
        const board = await this.boards.create({
            id: params.boardId ?? createBoardId(),
            createdAt: now,
            updatedAt: now,
            name: params.name,
            authorId: params.authorId,
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
            this.initBoard(board),
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
                    boardId: board.id,
                });
            }),
        ]);

        return board;
    }

    private async initBoard(board: Board) {
        const onboardGuide = await getAccount({
            accounts: this.accounts,
            boardService: this,
            crypto: this.crypto,
            email: 'onboarding@syncwave.dev',
            fullName: 'Syncwave Onboarding Guide',
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

        let cardCounter = 1;
        await whenAll(
            ONBOARDING_TEMPLATE.columns.map(async (column, idx) => {
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
                            cardCounter: cardCounter++,
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
        card: OnboardingCard;
        cardIndex: number;
        cardCounter: number;
    }) {
        const cardId = createCardId();
        await this.cards.create({
            authorId: params.onboardGuide.userId,
            boardId: params.board.id,
            columnId: params.columnId,
            createdAt: this.timestamp,
            text: createRichtext(htmlToYFragment(params.card.html)),
            id: cardId,
            counter: params.cardCounter,
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

interface OnboardingCard {
    html: string;
    messages: OnboardingMessage[];
}

interface OnboardingColumn {
    name: string;
    cards: OnboardingCard[];
}

interface OnboardingTemplate {
    columns: OnboardingColumn[];
}

interface OnboardingMessage {
    html: string;
}

const ONBOARDING_TEMPLATE: OnboardingTemplate = {
    columns: [
        {
            name: 'Backlog',
            cards: [
                {
                    html: `
                        <p>Welcome to Syncwave!</p>
                        <ul>
                            <li><b>Syncwave</b> is a collaborative tool for managing your projects.</li>
                            <li>Use it to track tasks, share ideas, and collaborate with your team.</li>
                            <li>Get started by creating a new board or joining an existing one.</li>
                            <li>Invite your team members to collaborate with you.</li>
                        </ul>
                        <p>Click on the <i>"Create Board"</i> button to get started.</p>
                    `,
                    messages: [
                        {
                            html: '<p>We are glad to have you here.</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'To Do',
            cards: [
                {
                    html: "<p>Let's get started!</p>",
                    messages: [
                        {
                            html: '<p>Here are some tips to get you started.</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'In Progress',
            cards: [
                {
                    html: '<p>Keep going!</p>',
                    messages: [
                        {
                            html: '<p>You are doing great!</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'Done',
            cards: [
                {
                    html: '<p>Congratulations!</p>',
                    messages: [
                        {
                            html: '<p>You have completed the onboarding process.</p>',
                        },
                    ],
                },
            ],
        },
    ],
};
