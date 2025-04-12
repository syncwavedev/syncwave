import {SvelteMap} from 'svelte/reactivity';
import {
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
    type Member,
    type Message,
    type MeViewDataDto,
    type Timestamp,
    type User,
} from 'syncwave';
import {observeAwareness} from './awareness.js';
import type {CrdtDerivator, CrdtManager} from './crdt-manager.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lateInit(): any {
    return undefined;
}

export class UserView implements User {
    private user: User = $state.raw(lateInit());

    constructor(user: User) {
        this.user = user;
    }

    deletedAt = $derived(this.user.deletedAt);
    updatedAt = $derived(this.user.updatedAt);
    createdAt = $derived(this.user.createdAt);
    id = $derived(this.user.id);
    pk = $derived(this.user.pk);
    fullName = $derived(this.user.fullName);
    avatarKey = $derived(this.user.avatarKey);
}

export interface SyncTarget {
    newBoard(board: Board): void;
    newUser(user: User): void;
    newCard(card: Card): void;
    newColumn(column: Column): void;
    newAttachment(attachment: Attachment): void;
    newMessage(message: Message): void;
    newAccount(account: Account): void;
    newMember(member: Member): void;
}

export class MeViewData implements SyncTarget {
    private readonly crdtManager!: CrdtManager;

    profile: User = $state.raw(lateInit());
    account: Account = $state.raw(lateInit());
    _members: Member[] = $state.raw(lateInit());

    boards = $derived(
        this._members
            .filter(x => !x.deletedAt)
            .map(x => this.crdtManager.viewById(x.boardId, 'board'))
            .filter(x => !x.deletedAt)
    );

    userView = $derived(new MeView(this.profile, this));

    static create(data: MeViewDataDto, crdtManager: CrdtManager) {
        const result = new MeViewData(crdtManager);
        result.override(data, crdtManager);
        return result;
    }

    private constructor(crdtManager: CrdtManager) {
        this.crdtManager = crdtManager;
    }

    newAccount(): void {
        // ignore
    }

    newMember(member: Member): void {
        if (this._members.some(x => x.id === member.id)) {
            return;
        }
        this._members = [...this._members, member];
    }

    newUser(): void {
        // ignore
    }

    newCard(): void {
        // ignore
    }

    newColumn(): void {
        // ignore
    }

    newAttachment(): void {
        // ignore
    }

    newMessage(): void {
        // ignore
    }

    newBoard() {
        // ignore
    }

    override(me: MeViewDataDto, derivator: CrdtDerivator) {
        me.boards.forEach(board => {
            // load board into crdt manager
            derivator.view({
                state: board.state,
                id: board.id,
                type: 'board',
                isDraft: false,
            });
        });

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
        this._members = me.members.map(x =>
            derivator.view({
                id: x.id,
                type: 'member',
                state: x.state,
                isDraft: false,
            })
        );
    }
}

export class MeView extends UserView {
    private readonly data!: MeViewData;

    constructor(user: User, data: MeViewData) {
        super(user);

        this.data = data;
    }

    boards = $derived(this.data.boards);
    account = $derived(this.data.account);
}

interface ClientInfo {
    state: AwarenessState;
    user: UserView;
}

export class BoardData implements SyncTarget {
    private readonly crdtManager!: CrdtManager;
    private board: Board = $state.raw(lateInit());

    rawMe: User = $state.raw(lateInit());
    rawUsers: User[] = $state.raw(lateInit());
    rawColumns: Column[] = $state.raw(lateInit());
    rawCards: Card[] = $state.raw(lateInit());

    readonly cardDragSettledAt = new SvelteMap<CardId, Timestamp>();
    readonly considerCardPosition = new SvelteMap<CardId, number>();
    readonly considerColumnId = new SvelteMap<CardId, ColumnId>();

    cardViews: CardView[] = $derived(
        this.rawCards.map(x => new CardView(x, this, this.crdtManager))
    );
    columnViews: ColumnView[] = $derived(
        this.rawColumns.map(x => new ColumnView(x, this, this.crdtManager))
    );
    columnTreeViews: ColumnTreeView[] = $derived(
        this.rawColumns.map(x => new ColumnTreeView(x, this, this.crdtManager))
    );
    boardView: BoardView = $derived(
        new BoardView(this.board, this, this.crdtManager)
    );
    boardTreeView: BoardTreeView = $derived(
        new BoardTreeView(this.board, this, this.crdtManager)
    );
    userViews: UserView[] = $derived(this.rawUsers.map(x => new UserView(x)));
    meView: UserView = $derived(new UserView(this.rawMe));

    awareness: SvelteMap<number, AwarenessState> = $state(lateInit());

    clients = $derived(
        [...this.awareness.values()]
            .filter(x => x.userId !== this.meView.id)
            .map(state => ({
                state,
                user: state.userId
                    ? this.crdtManager.tryViewById(state.userId, 'user')
                    : undefined,
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
        crdtManager: CrdtManager
    ) {
        const result = new BoardData(awareness, me, crdtManager);
        result.override(data, crdtManager);
        return result;
    }

    private constructor(
        public readonly rawAwareness: Awareness,
        me: User,
        crdtManager: CrdtManager
    ) {
        this.crdtManager = crdtManager;
        this.awareness = observeAwareness(rawAwareness);
        this.rawMe = me;
    }

    newAccount(): void {
        // ignore
    }

    newMember(): void {
        // ignore
    }

    newBoard(): void {
        // ignore
    }

    newAttachment(): void {
        // ignore
    }

    newMessage(): void {
        // ignore
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

    override(board: BoardViewDataDto, derivator: CrdtDerivator) {
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
}

export class BoardView implements Board {
    protected readonly _crdtManager!: CrdtManager;

    protected readonly _data!: BoardData;
    protected readonly _board!: Board;

    members = $derived(this._data.userViews.filter(x => !x.deletedAt));

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

    author = $derived.by(() =>
        this._crdtManager.viewById(this._board.authorId, 'user')
    );

    constructor(board: Board, data: BoardData, crdtManager: CrdtManager) {
        this._crdtManager = crdtManager;
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
    protected readonly crdtManager!: CrdtManager;

    constructor(column: Column, data: BoardData, crdtManager: CrdtManager) {
        this.crdtManager = crdtManager;
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
        const author = this.crdtManager.viewById(this._column.authorId, 'user');
        return new UserView(author);
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
    private readonly _crdtManager!: CrdtManager;

    constructor(card: Card, data: BoardData, crdtManager: CrdtManager) {
        assert(card.boardId === data.boardView.id, 'card.boardId === data.id');

        this._crdtManager = crdtManager;
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
        const author = this._crdtManager.viewById(this._card.authorId, 'user');
        return new UserView(author);
    });
    board = $derived(this._data.boardView);
    assignee = $derived.by(() => {
        if (!this._card.assigneeId) return undefined;

        const assignee = this._crdtManager.viewById(
            this._card.assigneeId,
            'user'
        );
        return new UserView(assignee);
    });
    column = $derived.by(() => {
        const column = this._crdtManager.viewById(
            this._card.columnId,
            'column'
        );
        return new ColumnView(column, this._data, this._crdtManager);
    });
}

export class CardTreeViewData implements SyncTarget {
    static create(dto: CardTreeViewDataDto, crdtManager: CrdtManager) {
        const result = new CardTreeViewData(dto.card.id, crdtManager);
        result.override(dto, crdtManager);
        return result;
    }

    private readonly crdtManager!: CrdtManager;

    rawCard: Card = $state.raw(lateInit());
    rawUsers: User[] = $state.raw(lateInit());
    rawMessages: Message[] = $state.raw(lateInit());
    rawAttachments: Attachment[] = $state.raw(lateInit());

    private constructor(
        public readonly cardId: CardId,
        crdtManager: CrdtManager
    ) {
        this.crdtManager = crdtManager;
    }

    cardView = $derived(new CardTreeView(this, this.crdtManager));
    userViews: UserView[] = $derived(this.rawUsers.map(x => new UserView(x)));

    newAccount(): void {
        // ignore
    }

    newMember(): void {
        // ignore
    }

    newBoard(): void {
        // ignore
    }

    newCard(): void {
        // ignore
    }

    newColumn(): void {
        // ignore
    }

    newAttachment(attachment: Attachment) {
        if (
            this.rawAttachments.some(x => x.id === attachment.id) ||
            this.cardView.id !== attachment.cardId
        ) {
            return;
        }
        this.rawAttachments = [...this.rawAttachments, attachment];
    }

    newMessage(message: Message) {
        if (
            this.rawMessages.some(x => x.id === message.id) ||
            this.cardView.id !== message.cardId
        ) {
            return;
        }
        this.rawMessages = [...this.rawMessages, message];
    }

    newUser(user: User) {
        if (this.rawUsers.some(x => x.id === user.id)) {
            return;
        }
        this.rawUsers = [...this.rawUsers, user];
    }

    override(dto: CardTreeViewDataDto, derivator: CrdtDerivator) {
        this.rawCard = derivator.view({
            id: dto.card.id,
            type: 'card',
            state: dto.card.state,
            isDraft: false,
        });
        this.cardView = derivator.view({
            id: dto.card.id,
            type: 'card',
            state: dto.card.state,
            isDraft: false,
        });
        this.rawMessages = dto.messages.map(x =>
            derivator.view({
                id: x.id,
                type: 'message',
                state: x.state,
                isDraft: false,
            })
        );
        this.rawAttachments = dto.attachments.map(x =>
            derivator.view({
                id: x.id,
                type: 'attachment',
                state: x.state,
                isDraft: false,
            })
        );
        this.rawUsers = dto.users.map(x =>
            derivator.view({
                id: x.id,
                type: 'user',
                state: x.state,
                isDraft: false,
            })
        );
    }
}

export class CardTreeView implements Card {
    private data: CardTreeViewData = $state.raw(lateInit());
    private crdtManager!: CrdtManager;

    constructor(data: CardTreeViewData, crdtManager: CrdtManager) {
        this.data = data;
        this.crdtManager = crdtManager;
    }

    deletedAt = $derived(this.data.rawCard.deletedAt);
    updatedAt = $derived(this.data.rawCard.updatedAt);
    createdAt = $derived(this.data.rawCard.createdAt);
    id = $derived(this.data.rawCard.id);
    pk = $derived(this.data.rawCard.pk);
    boardId = $derived(this.data.rawCard.boardId);
    columnId = $derived(this.data.rawCard.columnId);
    position = $derived(this.data.rawCard.position);
    counter = $derived(this.data.rawCard.counter);
    text = $derived(this.data.rawCard.text);
    authorId = $derived(this.data.rawCard.authorId);
    assigneeId = $derived(this.data.rawCard.assigneeId);

    messages: MessageView[] = $derived(
        this.data.rawMessages
            .map(x => new MessageView(x, this.data, this.crdtManager))
            .sort((a, b) => compareNumbers(a.createdAt, b.createdAt))
    );
}

export class MessageView implements Message {
    private message: Message = $state.raw(lateInit());
    private data: CardTreeViewData = $state.raw(lateInit());
    private crdtManager!: CrdtManager;

    constructor(
        message: Message,
        data: CardTreeViewData,
        crdtManager: CrdtManager
    ) {
        this.crdtManager = crdtManager;
        this.message = message;
        this.data = data;
    }

    author = $derived.by(() => {
        const author = this.crdtManager.viewById(this.message.authorId, 'user');
        return new UserView(author);
    });
    replyTo = $derived.by(() => {
        if (!this.message.replyToId) return undefined;

        const replyTo = this.crdtManager.viewById(
            this.message.replyToId,
            'message'
        );

        return new MessageView(replyTo, this.data, this.crdtManager);
    });
    attachments = $derived.by(() => {
        return this.data.rawAttachments.filter(x =>
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
