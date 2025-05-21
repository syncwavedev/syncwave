import {SvelteMap} from 'svelte/reactivity';
import {
    assert,
    assertNever,
    Awareness,
    CardAssigneeChangedMessagePayload,
    CardColumnChangedMessagePayload,
    CardCreatedMessagePayload,
    CardCursorDto,
    CardDeletedMessagePayload,
    compareNumbers,
    compareStrings,
    MemberId,
    MemberInfoDto,
    MemberRole,
    partition,
    TextMessagePayload,
    TransactionId,
    uniqBy,
    yFragmentToPlaintext,
    type Account,
    type Attachment,
    type AwarenessState,
    type Board,
    type BoardViewDataDto,
    type Card,
    type CardId,
    type Column,
    type ColumnId,
    type Member,
    type Message,
    type MeViewDataDto,
    type Timestamp,
    type User,
    type UserId,
} from 'syncwave';
import {getObjectUrl} from './agent.svelte.js';
import {observeAwareness} from './awareness.js';
import type {CrdtDerivator, CrdtManager} from './crdt-manager.js';

function findRequired<T>(items: T[], predicate: (item: T) => boolean): T {
    const item = items.find(predicate);
    assert(item !== undefined, 'findRequired: item is undefined');
    return item;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lateInit(): any {
    return undefined;
}

export class UserView implements User {
    private user: User = $state.raw(lateInit());

    constructor(
        user: User,
        public readonly email: string
    ) {
        this.user = user;
    }

    isDemo = $derived(this.user.isDemo);
    deletedAt = $derived(this.user.deletedAt);
    updatedAt = $derived(this.user.updatedAt);
    createdAt = $derived(this.user.createdAt);
    id = $derived(this.user.id);
    pk = $derived(this.user.pk);
    fullName = $derived(this.user.fullName);
    avatarKey = $derived(this.user.avatarKey);
    avatarUrlSmall = $derived.by(() => {
        if (this.user.avatarKey) {
            return getObjectUrl(this.user.avatarKey, 'small');
        }
        return undefined;
    });
    avatarUrlMedium = $derived.by(() => {
        if (this.user.avatarKey) {
            return getObjectUrl(this.user.avatarKey, 'medium');
        }
        return undefined;
    });
}

export class MemberView extends UserView {
    constructor(
        user: User,
        email: string,
        public readonly role: MemberRole,
        public readonly color: string
    ) {
        super(user, email);
    }
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
    upsertMemberInfo(userEmail: MemberInfoDto): void;
    upsertCardCursor(cardCursor: CardCursorDto): void;
    upsertOptimisticCardCursor(
        cardCursor: CardCursorDto,
        transactionId: TransactionId
    ): void;
    clearOptimisticState(transactionId: TransactionId): void;
}

export class MeViewData implements SyncTarget {
    private readonly crdtManager!: CrdtManager;

    profile: User = $state.raw(lateInit());
    account: Account = $state.raw(lateInit());
    _members: Member[] = $state.raw(lateInit());

    boards = $derived(
        this._members
            .filter(x => !x.deletedAt)
            .map(x => ({
                ...this.crdtManager.viewById(x.boardId, 'board'),
                memberId: x.id,
            }))
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

    clearOptimisticState(): void {
        // ignore
    }

    upsertMemberInfo(): void {
        // ignore
    }

    upsertOptimisticCardCursor(): void {
        // ignore
    }

    upsertCardCursor(): void {
        // ignore
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
        super(user, data.account.email);

        this.data = data;
    }

    boards = $derived(this.data.boards);
    account = $derived(this.data.account);
}

interface ClientInfo {
    state: AwarenessState;
    user: UserView;
}

const USER_COLORS = [
    '#958DF1',
    '#F98181',
    '#FBBC88',
    '#FAF594',
    '#70CFF8',
    '#94FADB',
    '#B9F18D',
    '#C3E2C2',
    '#EAECCC',
    '#AFC8AD',
    '#EEC759',
    '#9BB8CD',
    '#FF90BC',
    '#FFC0D9',
    '#DC8686',
    '#7ED7C1',
    '#F3EEEA',
    '#89B9AD',
    '#D0BFFF',
    '#FFF8C9',
    '#CBFFA9',
    '#9BABB8',
    '#E3F4F4',
];

interface OptimisticTimelineCursor {
    readonly transactionId: TransactionId;
    readonly dto: CardCursorDto;
}

export class BoardData implements SyncTarget {
    private readonly crdtManager!: CrdtManager;
    private board: Board = $state.raw(lateInit());
    public memberId: MemberId = $state.raw(lateInit());

    rawMembers: MemberInfoDto[] = $state.raw(lateInit());
    rawCardCursors: CardCursorDto[] = $state.raw(lateInit());
    optimisticTimelineCursors: OptimisticTimelineCursor[] =
        $state.raw(lateInit());
    rawMe: User = $state.raw(lateInit());
    rawUsers: User[] = $state.raw(lateInit());
    rawColumns: Column[] = $state.raw(lateInit());
    rawCards: Card[] = $state.raw(lateInit());
    rawMessages: Message[] = $state.raw(lateInit());
    rawAttachments: Attachment[] = $state.raw(lateInit());

    readonly cardDragSettledAt = new SvelteMap<CardId, Timestamp>();
    readonly considerCardPosition = new SvelteMap<CardId, number>();
    readonly considerColumnId = new SvelteMap<CardId, ColumnId>();

    readonly columnDragSettledAt = new SvelteMap<ColumnId, Timestamp>();
    readonly considerColumnPosition = new SvelteMap<ColumnId, number>();

    cardViews: CardTreeView[] = $derived(
        this.rawCards.map(x => new CardTreeView(x, this, this.crdtManager))
    );
    messageViews: MessageView[] = $derived(
        this.rawMessages.map(x => new MessageView(x, this))
    );
    columnViews: ColumnView[] = $derived(
        this.rawColumns.map(x => new ColumnView(x, this, this.crdtManager))
    );
    columnTreeViews: ColumnTreeView[] = $derived(
        this.rawColumns
            .map(x => new ColumnTreeView(x, this, this.crdtManager))
            .sort((a, b) => compareNumbers(a.position, b.position))
    );
    boardView: BoardView = $derived(
        new BoardView(this.board, this, this.crdtManager)
    );
    boardTreeView: BoardTreeView = $derived(
        new BoardTreeView(this.board, this, this.crdtManager)
    );
    allMemberViews: MemberView[] = $derived(
        this.rawUsers
            .slice()
            .sort((a, b) => {
                if (a.id < b.id) return -1;
                if (a.id > b.id) return 1;
                return 0;
            })
            .map((x, idx) => {
                const memberInfo = this.getMemberInfo(x.id);
                const memberColor = USER_COLORS[idx % USER_COLORS.length];
                return new MemberView(
                    x,
                    memberInfo.email,
                    memberInfo.role,
                    memberColor
                );
            })
    );
    activeMemberViews = $derived(this.allMemberViews.filter(x => !x.deletedAt));
    meView: MemberView = $derived.by(() => {
        const me = this.allMemberViews.find(x => x.id === this.rawMe.id);

        assert(me !== undefined, 'me is not part of the board members');

        return me;
    });
    awareness: SvelteMap<number, AwarenessState> = $state(lateInit());

    clients = $derived(
        [...this.awareness.values()]
            .filter(x => x.userId !== this.meView.id)
            .map(state => ({
                state,
                user: state.userId
                    ? findRequired(
                          this.allMemberViews,
                          x => x.id === state.userId
                      )
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

    clearOptimisticState(transactionId: TransactionId): void {
        this.optimisticTimelineCursors = this.optimisticTimelineCursors.filter(
            x => x.transactionId !== transactionId
        );
    }

    upsertMemberInfo(userEmail: MemberInfoDto): void {
        this.rawMembers = this.rawMembers
            .filter(x => x.userId !== userEmail.userId)
            .concat([userEmail]);
    }

    upsertCardCursor(cardCursor: CardCursorDto): void {
        if (cardCursor.boardId !== this.board.id) return;

        if (cardCursor)
            this.rawCardCursors = this.rawCardCursors
                .filter(
                    x =>
                        x.userId !== cardCursor.userId ||
                        x.cardId !== cardCursor.cardId
                )
                .concat([cardCursor]);
    }

    upsertOptimisticCardCursor(
        cardCursor: CardCursorDto,
        transactionId: TransactionId
    ) {
        if (cardCursor.boardId !== this.board.id) return;

        this.optimisticTimelineCursors = this.optimisticTimelineCursors
            .filter(
                x =>
                    x.dto.cardId !== cardCursor.cardId ||
                    x.dto.userId !== cardCursor.userId
            )
            .concat([{transactionId, dto: cardCursor}]);
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

    newAttachment(attachment: Attachment) {
        if (
            this.rawAttachments.some(x => x.id === attachment.id) ||
            this.board.id !== attachment.boardId
        ) {
            return;
        }
        this.rawAttachments = [...this.rawAttachments, attachment];
    }

    newMessage(message: Message) {
        if (
            this.rawMessages.some(x => x.id === message.id) ||
            this.board.id !== message.boardId
        ) {
            return;
        }
        this.rawMessages = [...this.rawMessages, message];
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
        this.memberId = board.memberId;

        this.rawMembers = board.members;
        console.log('override cardCursors', board.cardCursors);
        this.rawCardCursors = board.cardCursors;
        this.optimisticTimelineCursors = [];

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
        this.rawMessages = board.messages.map(x =>
            derivator.view({
                id: x.id,
                type: 'message',
                state: x.state,
                isDraft: false,
            })
        );
        this.rawAttachments = board.attachments.map(x =>
            derivator.view({
                id: x.id,
                type: 'attachment',
                state: x.state,
                isDraft: false,
            })
        );
    }

    getMemberInfo(userId: UserId): MemberInfoDto {
        return findRequired(this.rawMembers, x => x.userId === userId);
    }
}

export class BoardView implements Board {
    protected readonly _crdtManager!: CrdtManager;

    protected readonly _data!: BoardData;
    protected readonly _board!: Board;

    members = $derived(this._data.allMemberViews.filter(x => !x.deletedAt));

    memberId = $derived(this._data.memberId);

    authorId = $derived(this._board.authorId);
    deletedAt = $derived(this._board.deletedAt);
    updatedAt = $derived(this._board.updatedAt);
    createdAt = $derived(this._board.createdAt);
    key = $derived(this._board.key);
    name = $derived(this._board.name);
    id = $derived(this._board.id);
    pk = $derived(this._board.pk);
    joinCode = $derived(this._board.joinCode);
    joinRole = $derived(this._board.joinRole);
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
    position = $derived.by(() => {
        const dndPosition = this._data.considerColumnPosition.get(this.id);
        if (dndPosition) {
            return dndPosition;
        }

        return this._column.position;
    });

    board = $derived(this._data.boardView);
    author = $derived.by(() => {
        return findRequired(
            this._data.allMemberViews,
            x => x.id === this._column.authorId
        );
    });

    dndLastChangeAt = $derived.by(() =>
        this._data.columnDragSettledAt.get(this.id)
    );
    dndInProgress = $derived.by(
        () => this._data.columnDragSettledAt.get(this.id) !== undefined
    );
}

export class ColumnTreeView extends ColumnView {
    cards = $derived(
        this._data.cardViews
            .filter(x => x.columnId === this.id)
            .filter(x => !x.deletedAt)
            .sort((a, b) => compareNumbers(a.position, b.position))
    );
}

export class CardTreeView implements Card {
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
    plainText = $derived.by(() => {
        return yFragmentToPlaintext(this._card.text.__fragment!);
    });
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
    typingUsers = $derived.by(() => {
        return uniqBy(
            this._data.activeClients
                .filter(x => x.state?.typingMessageFor === this.id)
                .map(x => x.user),
            x => x.id
        );
    });

    author = $derived.by(() => {
        return findRequired(
            this._data.allMemberViews,
            x => x.id === this._card.authorId
        );
    });
    board = $derived(this._data.boardView);
    assignee = $derived.by(() => {
        if (!this._card.assigneeId) return undefined;

        return findRequired(
            this._data.allMemberViews,
            x => x.id === this._card.assigneeId
        );
    });
    column = $derived.by(() => {
        const column = this._crdtManager.viewById(
            this._card.columnId,
            'column'
        );
        return new ColumnView(column, this._data, this._crdtManager);
    });

    messages: MessageView[] = $derived(
        this._data.rawMessages
            .filter(x => !x.deletedAt && x.cardId === this._card.id)
            .map(x => new MessageView(x, this._data))
            .sort((a, b) => compareNumbers(a.createdAt, b.createdAt))
    );

    lastReadMessageTimestamp = $derived.by(() => {
        const meId = this._data.meView.id;

        const optimisticCursor = this._data.optimisticTimelineCursors.find(
            x => x.dto.cardId === this.id && x.dto.userId === meId
        );
        if (optimisticCursor) {
            return optimisticCursor.dto.timestamp;
        }

        return (
            this._data.rawCardCursors.find(
                x => x.cardId === this.id && x.userId === meId
            )?.timestamp ?? (0 as Timestamp)
        );
    });

    unreadMessages = $derived.by(() => {
        return this._data.messageViews.filter(
            x =>
                x.cardId === this.id &&
                x.createdAt > this.lastReadMessageTimestamp
        );
    });
}

export class MessageView implements Message {
    private _message: Message = $state.raw(lateInit());
    private _data: BoardData = $state.raw(lateInit());

    constructor(message: Message, data: BoardData) {
        this._message = message;
        this._data = data;
    }

    author = $derived.by(() => {
        return findRequired(
            this._data.allMemberViews,
            x => x.id === this._message.authorId
        );
    });
    replyTo = $derived.by(() => {
        if (!this._message.replyToId) return undefined;

        return findRequired(
            this._data.messageViews,
            x => x.id === this._message.authorId
        );
    });
    attachments = $derived.by(() => {
        return this._data.rawAttachments.filter(x =>
            this.attachmentIds.includes(x.id)
        );
    });

    payload = $derived.by(() => {
        if (this._message.payload.type === 'text') {
            return new TextMessagePayloadView(this._message.payload);
        } else if (this._message.payload.type === 'card_created') {
            return new CardCreatedMessagePayloadView(this._message.payload);
        } else if (this._message.payload.type === 'card_deleted') {
            return new CardDeletedMessagePayloadView(this._message.payload);
        } else if (this._message.payload.type === 'card_column_changed') {
            return new CardColumnChangedMessagePayloadView(
                this._message.payload
            );
        } else if (this._message.payload.type === 'card_assignee_changed') {
            return new CardAssigneeChangedMessagePayloadView(
                this._message.payload,
                this._data
            );
        } else {
            assertNever(this._message.payload);
        }
    });

    deletedAt = $derived(this._message.deletedAt);
    updatedAt = $derived(this._message.updatedAt);
    createdAt = $derived(this._message.createdAt);
    id = $derived(this._message.id);
    pk = $derived(this._message.pk);
    authorId = $derived(this._message.authorId);
    boardId = $derived(this._message.boardId);
    columnId = $derived(this._message.columnId);
    cardId = $derived(this._message.cardId);
    target = $derived(this._message.target);
    replyToId = $derived(this._message.replyToId);
    attachmentIds = $derived(this._message.attachmentIds);
}

export class CardCreatedMessagePayloadView
    implements CardCreatedMessagePayload
{
    private payload: CardCreatedMessagePayload = $state.raw(lateInit());

    constructor(payload: CardCreatedMessagePayload) {
        this.payload = payload;
    }

    cardId = $derived(this.payload.cardId);
    cardCreatedAt = $derived(this.payload.cardCreatedAt);
    type = $derived(this.payload.type);
}

export class CardDeletedMessagePayloadView
    implements CardDeletedMessagePayload
{
    private payload: CardDeletedMessagePayload = $state.raw(lateInit());

    constructor(payload: CardDeletedMessagePayload) {
        this.payload = payload;
    }

    cardId = $derived(this.payload.cardId);
    cardDeletedAt = $derived(this.payload.cardDeletedAt);
    type = $derived(this.payload.type);
}

export class CardColumnChangedMessagePayloadView
    implements CardColumnChangedMessagePayload
{
    private payload: CardColumnChangedMessagePayload = $state.raw(lateInit());

    constructor(payload: CardColumnChangedMessagePayload) {
        this.payload = payload;
    }

    cardId = $derived(this.payload.cardId);
    cardColumnChangedAt = $derived(this.payload.cardColumnChangedAt);
    type = $derived(this.payload.type);
    fromColumnId = $derived(this.payload.fromColumnId);
    toColumnId = $derived(this.payload.toColumnId);
    fromColumnName = $derived(this.payload.fromColumnName);
    toColumnName = $derived(this.payload.toColumnName);
}

export class CardAssigneeChangedMessagePayloadView
    implements CardAssigneeChangedMessagePayload
{
    private payload: CardAssigneeChangedMessagePayload = $state.raw(lateInit());

    constructor(
        payload: CardAssigneeChangedMessagePayload,
        private readonly _data: BoardData
    ) {
        this.payload = payload;
    }

    cardId = $derived(this.payload.cardId);
    cardAssigneeChangedAt = $derived(this.payload.cardAssigneeChangedAt);
    type = $derived(this.payload.type);
    fromAssigneeId = $derived(this.payload.fromAssigneeId);
    toAssigneeId = $derived(this.payload.toAssigneeId);
    fromAssignee = $derived.by(() => {
        if (!this.payload.fromAssigneeId) return undefined;

        return findRequired(
            this._data.allMemberViews,
            x => x.id === this.payload.fromAssigneeId
        );
    });
    toAssignee = $derived.by(() => {
        if (!this.payload.toAssigneeId) return undefined;

        return findRequired(
            this._data.allMemberViews,
            x => x.id === this.payload.toAssigneeId
        );
    });
}

export class TextMessagePayloadView implements TextMessagePayload {
    private payload: TextMessagePayload = $state.raw(lateInit());

    constructor(payload: TextMessagePayload) {
        this.payload = payload;
    }

    text = $derived(this.payload.text);
    type = $derived(this.payload.type);
}
