import {getAccount} from '../coordinator/auth-api.js';
import {createRichtext} from '../crdt/richtext.js';
import {htmlToYFragment} from '../richtext.js';
import {getNow, Timestamp} from '../timestamp.js';
import {uniqBy, whenAll} from '../utils.js';
import {createUuidV4} from '../uuid.js';
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
        members: string[];
        template: BoardTemplate;
        boardId?: BoardId;
        invite: false | {uiUrl: string};
    }): Promise<Board> {
        const now = getNow();

        let boardKey: string;
        let boardExists = false;
        do {
            boardKey = createUuidV4().replaceAll('-', '').slice(-8);
            boardKey = boardKey.slice(0, 4) + '-' + boardKey.slice(4);
            boardExists = await this.boards.getByKey(boardKey).then(x => !!x);
        } while (boardExists);

        const board = await this.boards.create({
            id: params.boardId ?? createBoardId(),
            createdAt: now,
            updatedAt: now,
            name: params.name,
            authorId: params.authorId,
            key: boardKey,
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

                if (params.invite) {
                    this.emailService.scheduleInviteEmail({
                        email: member,
                        boardName: params.name,
                        boardKey: boardKey,
                        uiUrl: params.invite.uiUrl,
                    });
                }
            }),
        ]);

        return board;
    }

    private async initBoard(board: Board, template: BoardTemplate) {
        const userIds = uniqBy(
            template.columns
                .flatMap(column => [
                    column.authorId,
                    ...column.cards.flatMap(card => [
                        card.assigneeId,
                        card.authorId,
                        ...card.messages.map(x => x.authorId),
                    ]),
                ])
                .filter(x => x !== undefined),
            x => x
        );

        await whenAll(
            userIds.map(async userId =>
                this.members.create({
                    id: createMemberId(),
                    boardId: board.id,
                    createdAt: this.timestamp,
                    updatedAt: this.timestamp,
                    userId: userId,
                    role: 'writer',
                    position: Math.random(),
                })
            )
        );

        await this.boards.incrementBoardCounter(
            board.id,
            template.columns.reduce(
                (acc, column) => acc + column.cards.length,
                0
            )
        );

        let counter = 1;
        await whenAll(
            template.columns.map(async (column, idx) => {
                const columnId = createColumnId();
                await this.columns.create({
                    authorId: column.authorId,
                    boardId: board.id,
                    id: columnId,
                    name: column.name,
                    position: idx + Math.random() / 2,
                    updatedAt: this.timestamp,
                    createdAt: this.timestamp,
                });

                await whenAll(
                    column.cards.map(async (card, cardIdx) => {
                        await this.createCard({
                            board,
                            columnId,
                            card,
                            cardIndex: cardIdx,
                            counter: counter++,
                        });
                    })
                );
            })
        );
    }

    private async createCard(params: {
        board: Board;
        columnId: ColumnId;
        card: CardTemplate;
        cardIndex: number;
        counter: number;
    }) {
        const cardId = createCardId();
        await this.cards.create({
            authorId: params.card.authorId,
            boardId: params.board.id,
            assigneeId: params.card.assigneeId,
            columnId: params.columnId,
            createdAt: this.timestamp,
            text: createRichtext(htmlToYFragment(params.card.html)),
            id: cardId,
            counter: params.counter,
            position: params.cardIndex + Math.random() + 1,
            updatedAt: this.timestamp,
        });

        await this.messages.create({
            id: createMessageId(),
            attachmentIds: [],
            authorId: params.card.authorId,
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
                authorId: message.authorId,
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
