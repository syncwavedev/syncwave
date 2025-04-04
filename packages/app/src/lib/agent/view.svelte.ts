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
    type AwarenessState,
    type Board,
    type BoardViewDataDto,
    type Card,
    type CardId,
    type Column,
    type ColumnId,
    type MeViewDataDto,
    type Timestamp,
    type User,
} from 'syncwave';
import {observeAwareness} from './awareness.svelte.js';
import type {CrdtDerivator} from './crdt-manager.js';
import type {State} from './state.js';

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

export class MeView {
    private _profileState: State<User> = $state.raw(lateInit());
    private _accountState: State<Account> = $state.raw(lateInit());
    private _boardStates: Array<State<Board>> = $state.raw(lateInit());

    profile: UserView = $derived(new UserView(this._profileState.value));
    account: Account = $derived(this._accountState.value);

    boards: Board[] = $derived(this._boardStates.map(x => x.value));

    static create(data: MeViewDataDto, derivator: CrdtDerivator) {
        const result = new MeView();
        result.update(data, derivator);
        return result;
    }

    private constructor() {}

    update(me: MeViewDataDto, derivator: CrdtDerivator) {
        this._accountState = derivator.view({
            state: me.account.state,
            id: me.account.id,
            type: 'account',
            isDraft: false,
        });
        this._profileState = derivator.view({
            state: me.profile.state,
            id: me.profile.id,
            type: 'user',
            isDraft: false,
        });
        this._boardStates = me.boards.map(x =>
            derivator.view({
                id: x.id,
                type: 'board',
                state: x.state,
                isDraft: false,
            })
        );
    }
}

interface ClientInfo {
    state: AwarenessState;
    user: UserView;
}

export class BoardData {
    private _boardState: State<Board> = $state.raw(lateInit());
    private _meState: State<User> = $state.raw(lateInit());
    private _userStates: Array<State<User>> = $state.raw(lateInit());
    private _columnStates: Array<State<Column>> = $state.raw(lateInit());
    private _cardStates: Array<State<Card>> = $state.raw(lateInit());

    readonly cardDragSettledAt = new SvelteMap<CardId, Timestamp>();
    readonly considerCardPosition = new SvelteMap<CardId, number>();
    readonly considerColumnId = new SvelteMap<CardId, ColumnId>();

    private me: User = $derived(this._meState.value);
    private board: Board = $derived(this._boardState.value);
    private users: User[] = $derived(this._userStates.map(x => x.value));
    private columns: Column[] = $derived(this._columnStates.map(x => x.value));
    private cards: Card[] = $derived(this._cardStates.map(x => x.value));

    cardViews: CardView[] = $derived(
        this.cards.map(x => new CardView(x, this))
    );
    columnViews: ColumnView[] = $derived(
        this.columns.map(x => new ColumnView(x, this))
    );
    columnTreeViews: ColumnTreeView[] = $derived(
        this.columns.map(x => new ColumnTreeView(x, this))
    );
    boardView: BoardView = $derived(new BoardView(this.board, this));
    boardTreeView: BoardTreeView = $derived(
        new BoardTreeView(this.board, this)
    );
    userViews: UserView[] = $derived(this.users.map(x => new UserView(x)));
    meView: UserView = $derived(new UserView(this.me));

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
        me: State<User>,
        data: BoardViewDataDto,
        derivator: CrdtDerivator
    ) {
        const result = new BoardData(awareness, me);
        result.update(data, derivator);
        return result;
    }

    private constructor(
        public rawAwareness: Awareness,
        me: State<User>
    ) {
        this.awareness = observeAwareness(rawAwareness);
        this._meState = me;
    }

    update(board: BoardViewDataDto, derivator: CrdtDerivator) {
        this._boardState = derivator.view({
            state: board.board.state,
            id: board.board.id,
            type: 'board',
            isDraft: false,
        });
        this._userStates = board.users.map(x =>
            derivator.view({
                id: x.id,
                type: 'user',
                state: x.state,
                isDraft: false,
            })
        );
        this._columnStates = board.columns.map(x =>
            derivator.view({
                id: x.id,
                type: 'column',
                state: x.state,
                isDraft: false,
            })
        );
        this._cardStates = board.cards.map(x =>
            derivator.view({
                id: x.id,
                type: 'card',
                state: x.state,
                isDraft: false,
            })
        );
    }

    newCard(card: State<Card>) {
        if (
            card.value.boardId !== this.board.id ||
            this._cardStates.some(x => x.value.id === card.value.id)
        ) {
            return;
        }
        this._cardStates = [...this._cardStates, card];
    }

    newUser(user: State<User>) {
        if (this._userStates.some(x => x.value.id === user.value.id)) {
            return;
        }
        this._userStates = [...this._userStates, user];
    }

    newColumn(column: State<Column>) {
        if (
            column.value.boardId !== this.board.id ||
            this._columnStates.some(x => x.value.id === column.value.id)
        ) {
            return;
        }
        this._columnStates = [...this._columnStates, column];
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
    private readonly _card: Card = lateInit();
    private readonly _data: BoardData = lateInit();

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

export class UserView implements User {
    private _user: State<User> = $state.raw(lateInit());

    constructor(user: User) {
        this._user = {value: user};
    }

    deleted = $derived(this._user.value.deletedAt !== undefined);
    updatedAt = $derived(this._user.value.updatedAt);
    createdAt = $derived(this._user.value.createdAt);
    id = $derived(this._user.value.id);
    pk = $derived(this._user.value.pk);
    fullName = $derived(this._user.value.fullName);
    avatarKey = $derived(this._user.value.avatarKey);

    update(user: User) {
        this._user = {value: user};
    }
}
