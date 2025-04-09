import {SvelteMap} from 'svelte/reactivity';
import {
    AppError,
    assert,
    Awareness,
    compareNumbers,
    compareStrings,
    partition,
    uniqBy,
    type Account,
    type Attachment,
    type AwarenessState,
    type Board,
    type BoardViewDataDto,
    type Card,
    type CardId,
    type CardTreeViewDataDto,
    type Column,
    type ColumnId,
    type Message,
    type MeViewDataDto,
    type Timestamp,
    type User,
} from 'syncwave';
import {observeAwareness} from './awareness.svelte.js';
import type {CrdtDerivator} from './crdt-manager.js';

function findRequired<T>(array: T[], predicate: (item: T) => boolean): T {
    const item = array.find(predicate);
    if (!item) {
        throw new AppError('Item not found');
    }
    return item;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lateInit(): any {
    return undefined;
}

export class UserView implements User {
    private user: User = $state.raw(lateInit());

    constructor(user: User) {
        this.user = user;
    }

    deleted = $derived(this.user.deletedAt !== undefined);
    updatedAt = $derived(this.user.updatedAt);
    createdAt = $derived(this.user.createdAt);
    id = $derived(this.user.id);
    pk = $derived(this.user.pk);
    fullName = $derived(this.user.fullName);
    avatarKey = $derived(this.user.avatarKey);

    update(user: User) {
        this.user = user;
    }
}

export class MeView {
    profile: User = $state.raw(lateInit());
    boards: Board[] = $state.raw(lateInit());
    account: Account = $state.raw(lateInit());

    profileView: UserView = $derived(new UserView(this.profile));

    static create(data: MeViewDataDto, derivator: CrdtDerivator) {
        const result = new MeView();
        result.update(data, derivator);
        return result;
    }

    private constructor() {}

    update(me: MeViewDataDto, derivator: CrdtDerivator) {
        this.account = derivator.view({
            state: me.account.state,
            id: me.account.id,
            type: 'account',
            isDraft: false,
        });
        this.profile = derivator.view({
            state: me.profile.state,
            id: me.profile.id,
            type: 'user',
            isDraft: false,
        });
        this.boards = me.boards.map(x =>
            derivator.view({
                id: x.id,
                type: 'board',
                state: x.state,
                isDraft: false,
            })
        );
    }

    newBoard(board: Board) {
        if (this.boards.some(x => x.id === board.id)) {
            return;
        }
        this.boards = [...this.boards, board];
    }
}

interface ClientInfo {
    state: AwarenessState;
    user: UserView;
}

export class BoardData {
    private board: Board = $state.raw(lateInit());

    rawMe: User = $state.raw(lateInit());
    rawUsers: User[] = $state.raw(lateInit());
    rawColumns: Column[] = $state.raw(lateInit());
    rawCards: Card[] = $state.raw(lateInit());

    readonly cardDragSettledAt = new SvelteMap<CardId, Timestamp>();
    readonly considerCardPosition = new SvelteMap<CardId, number>();
    readonly considerColumnId = new SvelteMap<CardId, ColumnId>();

    cardViews: CardView[] = $derived(
        this.rawCards.map(x => new CardView(x, this))
    );
    columnViews: ColumnView[] = $derived(
        this.rawColumns.map(x => new ColumnView(x, this))
    );
    columnTreeViews: ColumnTreeView[] = $derived(
        this.rawColumns.map(x => new ColumnTreeView(x, this))
    );
    boardView: BoardView = $derived(new BoardView(this.board, this));
    boardTreeView: BoardTreeView = $derived(
        new BoardTreeView(this.board, this)
    );
    userViews: UserView[] = $derived(this.rawUsers.map(x => new UserView(x)));
    meView: UserView = $derived(new UserView(this.rawMe));

    awareness: SvelteMap<number, AwarenessState> = $state(lateInit());

    clients = $derived(
        [...this.awareness.values()]
            .filter(x => x.userId !== this.meView.id)
            .map(state => ({
                state,
                user: this.userViews.find(x => x.id === state?.userId),
            }))
            // awareness might be ahead of the board data, so ignore unknown users
            .filter(x => x.user !== undefined) as ClientInfo[]
    );

    activeClients = $derived(this.clients.filter(x => x.state.active));
    idleClients = $derived(this.clients.filter(x => !x.state.active));

    static create(
        awareness: Awareness,
        me: User,
        data: BoardViewDataDto,
        derivator: CrdtDerivator
    ) {
        const result = new BoardData(awareness, me);
        result.update(data, derivator);
        return result;
    }

    private constructor(
        public rawAwareness: Awareness,
        me: User
    ) {
        this.awareness = observeAwareness(rawAwareness);
        this.rawMe = me;
    }

    update(board: BoardViewDataDto, derivator: CrdtDerivator) {
        this.board = derivator.view({
            state: board.board.state,
            id: board.board.id,
            type: 'board',
            isDraft: false,
        });
        this.rawUsers = board.users.map(x =>
            derivator.view({
                id: x.id,
                type: 'user',
                state: x.state,
                isDraft: false,
            })
        );
        this.rawColumns = board.columns.map(x =>
            derivator.view({
                id: x.id,
                type: 'column',
                state: x.state,
                isDraft: false,
            })
        );
        this.rawCards = board.cards.map(x =>
            derivator.view({
                id: x.id,
                type: 'card',
                state: x.state,
                isDraft: false,
            })
        );
    }

    newCard(card: Card) {
        if (
            card.boardId !== this.board.id ||
            this.rawCards.some(x => x.id === card.id)
        ) {
            return;
        }
        this.rawCards = [...this.rawCards, card];
    }

    newUser(user: User) {
        if (this.rawUsers.some(x => x.id === user.id)) {
            return;
        }
        this.rawUsers = [...this.rawUsers, user];
    }

    newColumn(column: Column) {
        if (
            column.boardId !== this.board.id ||
            this.rawColumns.some(x => x.id === column.id)
        ) {
            return;
        }
        this.rawColumns = [...this.rawColumns, column];
    }
}

export class BoardView implements Board {
    protected readonly _data!: BoardData;
    protected readonly _board!: Board;

    members = $derived(this._data.userViews);

    authorId = $derived(this._board.authorId);
    deletedAt = $derived(this._board.deletedAt);
    updatedAt = $derived(this._board.updatedAt);
    createdAt = $derived(this._board.createdAt);
    key = $derived(this._board.key);
    name = $derived(this._board.name);
    id = $derived(this._board.id);
    pk = $derived(this._board.pk);
    onlineUsers = $derived.by(() => {
        const [active, idle] = partition(
            uniqBy(this._data.clients, x => x.user.id).sort((a, b) =>
                compareStrings(a.user.id, b.user.id)
            ),
            x => x.state.active
        );

        return [...active, ...idle];
    });

    author = $derived.by(() => {
        return findRequired(
            this._data.userViews,
            x => x.id === this._board.authorId
        );
    });

    constructor(board: Board, data: BoardData) {
        this._board = board;
        this._data = data;
    }
}

export class BoardTreeView extends BoardView {
    columns = $derived(
        this._data.columnTreeViews
            .filter(x => !x.deletedAt)
            .sort((a, b) => compareNumbers(a.position, b.position))
    );
}

export class ColumnView implements Column {
    protected readonly _column!: Column;
    protected readonly _data!: BoardData;

    constructor(column: Column, data: BoardData) {
        assert(
            column.boardId === data.boardView.id,
            'column.boardId === data.id'
        );

        this._column = column;
        this._data = data;
    }

    authorId = $derived(this._column.authorId);
    deletedAt = $derived(this._column.deletedAt);
    updatedAt = $derived(this._column.updatedAt);
    createdAt = $derived(this._column.createdAt);
    name = $derived(this._column.name);
    id = $derived(this._column.id);
    pk = $derived(this._column.pk);
    boardId = $derived(this._column.boardId);
    position = $derived(this._column.position);

    board = $derived(this._data.boardView);
    author = $derived.by(() => {
        return findRequired(
            this._data.userViews,
            x => x.id === this._column.authorId
        );
    });
}

export class ColumnTreeView extends ColumnView {
    cards = $derived(
        this._data.cardViews
            .filter(x => x.columnId === this.id)
            .filter(x => !x.deletedAt)
            .sort((a, b) => compareNumbers(a.position, b.position))
    );
}

export class CardView implements Card {
    private readonly _card!: Card;
    private readonly _data!: BoardData;

    constructor(card: Card, data: BoardData) {
        assert(card.boardId === data.boardView.id, 'card.boardId === data.id');

        this._card = card;
        this._data = data;
    }

    dndLastChangeAt = $derived.by(() =>
        this._data.cardDragSettledAt.get(this.id)
    );
    dndInProgress = $derived.by(
        () => this._data.cardDragSettledAt.get(this.id) !== undefined
    );

    isDraft = $derived(this._card.counter === null);
    authorId = $derived(this._card.authorId);
    deletedAt = $derived(this._card.deletedAt);
    updatedAt = $derived(this._card.updatedAt);
    createdAt = $derived(this._card.createdAt);
    id = $derived(this._card.id);
    pk = $derived(this._card.pk);
    boardId = $derived(this._card.boardId);
    columnId = $derived.by(() => {
        const dndColumnId = this._data.considerColumnId.get(this.id);
        if (dndColumnId) {
            return dndColumnId;
        }

        return this._card.columnId;
    });
    position = $derived.by(() => {
        const dndPosition = this._data.considerCardPosition.get(this.id);
        if (dndPosition) {
            return dndPosition;
        }

        return this._card.position;
    });
    counter = $derived(this._card.counter);
    text = $derived(this._card.text);
    assigneeId = $derived(this._card.assigneeId);
    hoverUsers = $derived.by(() => {
        return uniqBy(
            this._data.activeClients
                .filter(x => x.state?.hoverCardId === this.id)
                .map(x => x.user),
            x => x.id
        );
    });
    viewerUsers = $derived.by(() => {
        return uniqBy(
            this._data.activeClients
                .filter(x => x.state?.selectedCardId === this.id)
                .map(x => x.user),
            x => x.id
        );
    });

    author = $derived.by(() => {
        return findRequired(
            this._data.userViews,
            x => x.id === this._card.authorId
        );
    });
    board = $derived(this._data.boardView);
    assignee = $derived.by(() => {
        if (!this._card.assigneeId) return undefined;

        return findRequired(
            this._data.userViews,
            x => x.id === this._card.assigneeId
        );
    });
    column = $derived.by(() => {
        return findRequired(
            this._data.columnViews,
            x => x.id === this._card.columnId
        );
    });
}

export class CardTreeViewData {
    static create(
        boardData: BoardData,
        dto: CardTreeViewDataDto,
        derivator: CrdtDerivator
    ) {
        const result = new CardTreeViewData(dto.cardId, boardData);
        result.update(dto, derivator);
        return result;
    }

    public readonly boardData!: BoardData;

    messages: Message[] = $state.raw(lateInit());
    attachments: Attachment[] = $state.raw(lateInit());

    private constructor(
        public readonly cardId: CardId,
        boardData: BoardData
    ) {
        this.boardData = boardData;
    }

    card = $derived(
        new CardTreeView(
            findRequired(this.boardData.rawCards, x => x.id === this.cardId),
            this
        )
    );

    update(dto: CardTreeViewDataDto, derivator: CrdtDerivator) {
        this.messages = dto.messages.map(x =>
            derivator.view({
                id: x.id,
                type: 'message',
                state: x.state,
                isDraft: false,
            })
        );
        this.attachments = dto.attachments.map(x =>
            derivator.view({
                id: x.id,
                type: 'attachment',
                state: x.state,
                isDraft: false,
            })
        );
    }

    newAttachment(attachment: Attachment) {
        if (
            this.attachments.some(x => x.id === attachment.id) ||
            this.card.id !== attachment.cardId
        ) {
            return;
        }
        this.attachments = [...this.attachments, attachment];
    }

    newMessage(message: Message) {
        if (
            this.messages.some(x => x.id === message.id) ||
            this.card.id !== message.cardId
        ) {
            return;
        }
        this.messages = [...this.messages, message];
    }
}

export class CardTreeView extends CardView {
    private data: CardTreeViewData = $state.raw(lateInit());

    constructor(card: Card, data: CardTreeViewData) {
        super(card, data.boardData);
        this.data = data;
    }

    messages: MessageView[] = $derived(
        this.data.messages
            .map(x => new MessageView(x, this.data))
            .sort((a, b) => compareNumbers(a.createdAt, b.createdAt))
    );
}

export class MessageView implements Message {
    private message: Message = $state.raw(lateInit());
    private data: CardTreeViewData = $state.raw(lateInit());

    constructor(message: Message, data: CardTreeViewData) {
        this.message = message;
        this.data = data;
    }

    author = $derived.by(() => {
        return findRequired(
            this.data.boardData.userViews,
            x => x.id === this.message.authorId
        );
    });
    replyTo = $derived.by(() => {
        if (!this.message.replyToId) return undefined;
        return findRequired(
            this.data.messages,
            x => x.id === this.message.replyToId
        );
    });
    attachments = $derived.by(() => {
        return this.data.attachments.filter(x =>
            this.attachmentIds.includes(x.id)
        );
    });

    deletedAt = $derived(this.message.deletedAt);
    updatedAt = $derived(this.message.updatedAt);
    createdAt = $derived(this.message.createdAt);
    id = $derived(this.message.id);
    pk = $derived(this.message.pk);
    authorId = $derived(this.message.authorId);
    boardId = $derived(this.message.boardId);
    columnId = $derived(this.message.columnId);
    cardId = $derived(this.message.cardId);
    target = $derived(this.message.target);
    payload = $derived(this.message.payload);
    replyToId = $derived(this.message.replyToId);
    attachmentIds = $derived(this.message.attachmentIds);
}
