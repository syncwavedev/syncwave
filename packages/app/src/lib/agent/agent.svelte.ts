import {getContext, onDestroy, setContext} from 'svelte';
import {
    assert,
    assertNever,
    Awareness,
    CancelledError,
    Context,
    context,
    Crdt,
    CrdtDiff,
    createBoardId,
    createCardId,
    createClientId,
    createColumnId,
    createCoordinatorApi,
    createJoinCode,
    createMessageId,
    createRichtext,
    createRpcClient,
    createTransactionId,
    createUuidV4,
    getNow,
    infiniteRetry,
    log,
    MemberRole,
    MESSAGE_TYPING_AWARENESS_TIMEOUT_MS,
    PersistentConnection,
    RpcConnection,
    softNever,
    Timestamp,
    toPosition,
    toStream,
    whenAll,
    type Account,
    type ActivityMonitor,
    type Attachment,
    type Board,
    type BoardId,
    type BoardViewDataDto,
    type Card,
    type CardId,
    type ChangeEvent,
    type Column,
    type ColumnId,
    type CoordinatorRpc,
    type CryptoProvider,
    type Member,
    type MemberId,
    type Message,
    type MessageId,
    type MeViewDataDto,
    type Placement,
    type TransportClient,
    type User,
    type UserId,
} from 'syncwave';
import type {XmlFragment} from 'yjs';

import type {AuthManager} from '../../auth-manager';

import {WebCryptoProvider} from 'syncwave/web-crypto-provider.js';
import {AwarenessSynchronizer} from './awareness-synchronizer';
import {CrdtManager, type EntityState} from './crdt-manager';
import {
    BoardData,
    BoardTreeView,
    CardTreeView,
    MemberView,
    MeView,
    MeViewData,
    type SyncTarget,
} from './view.svelte';

export interface ContextManager {
    use(): Context;
}

export const SvelteComponentContextManager: ContextManager = {
    use: () => {
        const [componentCtx, cancelComponentCtx] = context().createChild({
            span: 'getRpc',
        });
        onDestroy(() => {
            cancelComponentCtx(
                new CancelledError('component destroyed', undefined)
            );
        });

        return componentCtx;
    },
};

export class Agent {
    private crdtManager: CrdtManager;
    private readonly connection: RpcConnection;
    private readonly persistentConnection: PersistentConnection<unknown>;
    public readonly rpc: CoordinatorRpc;

    private activeBoards: BoardData[] = [];
    private activeMes: MeViewData[] = [];

    private cryptoProvider: CryptoProvider = new WebCryptoProvider();

    private syncTargets(): SyncTarget[] {
        return [...this.activeBoards, ...this.activeMes];
    }

    status: 'online' | 'unstable' | 'offline' = $state('offline');
    pingLatency: number | undefined = $state(undefined);
    pingProbesCount = $state(0);

    pingTimeout: NodeJS.Timeout | undefined;
    private open = true;

    constructor(
        client: TransportClient<unknown>,
        private readonly authManager: AuthManager,
        private readonly contextManager: ContextManager,
        private readonly activityMonitor: ActivityMonitor
    ) {
        this.persistentConnection = new PersistentConnection(client);
        this.persistentConnection.events.subscribe(status => {
            if (this.status === 'online') {
                this.status = status;
            }
        });
        this.connection = new RpcConnection(this.persistentConnection);

        const jwt = this.authManager.getJwt() ?? undefined;

        this.rpc = createRpcClient(
            createCoordinatorApi(),
            this.connection,
            () => ({
                ...context().extract(),
                auth: jwt,
            })
        );
        this.crdtManager = new CrdtManager(this.rpc);

        this.ping();
    }

    private async ping() {
        let unstable = false;
        const unstableTimeoutId = setTimeout(() => {
            unstable = true;
            if (this.status === 'online') {
                this.status = 'unstable';
            }
        }, 1000);

        try {
            const {time} = await this.rpc.echo({time: performance.now()});
            if (unstable) {
                this.status = 'unstable';
            } else {
                this.status = 'online';
            }

            const pingLatency = performance.now() - time;
            this.pingProbesCount += 1;
            // first latency prob waits for connection to open, so it's not representative
            // of the actual latency
            if (this.pingProbesCount <= 1) {
                return;
            }

            if (this.pingLatency === pingLatency) {
                // use different value to indicate liveness of the board
                // otherwise user might assume that something isn't working and ping latency is stuck
                this.pingLatency = pingLatency + 1;
            } else {
                this.pingLatency = pingLatency;
            }
        } catch (error) {
            this.status = 'offline';

            log.error({
                error,
                msg: 'agent ping failed',
            });
            this.persistentConnection.disconnect(error);
        } finally {
            clearTimeout(unstableTimeoutId);
            if (this.open) {
                setTimeout(() => this.ping(), 500);
            }
        }
    }

    isSettled(): boolean {
        return this.crdtManager.isSettled();
    }

    async waitSettled() {
        return await this.crdtManager.waitSettled();
    }

    async sendSignInEmail(email: string) {
        return await this.rpc.sendSignInEmail({email});
    }

    async verifySignInCode(options: {email: string; code: string}) {
        return await this.rpc.verifySignInCode(options);
    }

    close(reason: unknown) {
        if (!this.open) return;

        this.open = false;
        this.rpc.close(reason);
        this.crdtManager.close(reason);
        this.connection.close(reason);
        clearTimeout(this.pingTimeout);
    }

    getDemoData() {
        return this.rpc.createDemoBoard({});
    }

    // use config.passwordsEnabled to conditionally render UI
    async register(params: {
        email: string;
        fullName: string;
        password: string;
    }) {
        return await this.rpc.register({
            email: params.email,
            fullName: params.fullName,
            password: params.password,
        });
    }

    async signIn(params: {email: string; password: string}) {
        return await this.rpc.signIn({
            email: params.email,
            password: params.password,
        });
    }

    handleCardMouseEnter(boardId: BoardId, cardId: CardId) {
        this.activeBoards
            .filter(x => x.boardView.id === boardId)
            .forEach(board => {
                board.rawAwareness.setLocalStateField('hoverCardId', cardId);
            });
    }

    handleCardMouseLeave(boardId: BoardId, cardId: CardId) {
        this.activeBoards
            .filter(x => x.boardView.id === boardId)
            .forEach(board => {
                if (
                    board.rawAwareness.getLocalState()?.hoverCardId === cardId
                ) {
                    board.rawAwareness.setLocalStateField(
                        'hoverCardId',
                        undefined
                    );
                }
            });
    }

    handleCardMessageKeyDown(boardId: BoardId, cardId: CardId) {
        const eventId = createUuidV4();
        this.activeBoards
            .filter(x => x.boardView.id === boardId)
            .forEach(board => {
                board.rawAwareness.setLocalStateField(
                    'typingMessageFor',
                    cardId
                );
                board.rawAwareness.setLocalStateField(
                    'typingMessageEventId',
                    eventId
                );
                setTimeout(() => {
                    const localState = board.rawAwareness.getLocalState();
                    if (localState.typingMessageEventId === eventId) {
                        board.rawAwareness.setLocalStateField(
                            'typingMessageFor',
                            undefined
                        );
                    }
                }, MESSAGE_TYPING_AWARENESS_TIMEOUT_MS);
            });
    }

    handleCardMessageBlur(boardId: BoardId, cardId: CardId) {
        this.activeBoards
            .filter(x => x.boardView.id === boardId)
            .forEach(board => {
                const localState = board.rawAwareness.getLocalState();
                if (localState.typingMessageFor === cardId) {
                    board.rawAwareness.setLocalStateField(
                        'typingMessageFor',
                        undefined
                    );
                }
            });
    }

    async updateJoinCode(boardId: BoardId) {
        const code = await createJoinCode(this.cryptoProvider);
        this.crdtManager.update<Board>(boardId, x => {
            x.joinCode = code;
        });
    }

    async joinViaCode(code: string): Promise<{boardKey: string}> {
        return await this.rpc.joinByCode({code});
    }

    async observeMeAsync(): Promise<MeView> {
        const ctx = this.contextManager.use();

        const me = await this.rpc
            .getMeViewData({})
            .filter(x => x.type === 'snapshot')
            .map(x => x.data)
            .first();

        return ctx.run(() => this.observeMe(me));
    }

    private observeMe(initialMe: MeViewDataDto): MeView {
        const data = MeViewData.create(initialMe, this.crdtManager);

        this.activeMes.push(data);
        context().onEnd(() => {
            this.activeMes = this.activeMes.filter(x => x !== data);
        });

        let nextOffset: number | undefined = undefined;

        infiniteRetry(async () => {
            const items = toStream(
                this.rpc.getMeViewData({startOffset: nextOffset})
            );

            for await (const item of items) {
                nextOffset = item.offset + 1;
                if (item.type === 'snapshot') {
                    data.override(item.data, this.crdtManager);
                } else if (item.type === 'event') {
                    this.handleEvent(item.event);
                } else {
                    softNever(item, 'observeBoard got an unknown event');
                }
            }
        }, 'observeMe').catch(error => {
            log.error({error, msg: 'observeMe failed'});
        });

        return data.userView;
    }

    async observeBoardAsync(
        key: string
    ): Promise<[BoardTreeView, Awareness, MemberView]> {
        const ctx = this.contextManager.use();

        const activeBoard = this.activeBoards.find(
            x => x.boardView.key === key
        );
        if (activeBoard !== undefined) {
            return [
                activeBoard.boardTreeView,
                activeBoard.rawAwareness,
                activeBoard.meView,
            ];
        }

        const [board, me] = await whenAll([
            this.rpc
                .getBoardViewData({key})
                .filter(x => x.type === 'snapshot')
                .map(x => x.data)
                .first(),
            this.rpc
                .getMeViewData({})
                .filter(x => x.type === 'snapshot')
                .map(x => x.data.profile)
                .first(),
        ]);

        return ctx.detach({span: 'observeBoard'}, () =>
            this.observeBoard(board, me)
        );
    }

    private observeBoard(
        dto: BoardViewDataDto,
        initialMe: {id: UserId; state: CrdtDiff<User>}
    ): [BoardTreeView, Awareness, MemberView] {
        const me: User = this.crdtManager.view({
            id: initialMe.id,
            isDraft: false,
            state: initialMe.state,
            type: 'user',
        });
        const awareness = this.createBoardAwareness(
            dto.board.id,
            me,
            this.activityMonitor
        );
        const data = BoardData.create(awareness, me, dto, this.crdtManager);

        this.activeBoards.push(data);

        let nextOffset: number | undefined = undefined;

        infiniteRetry(async () => {
            const items = toStream(
                this.rpc.getBoardViewData({
                    key: dto.board.key,
                    startOffset: nextOffset,
                })
            );

            for await (const item of items) {
                nextOffset = item.offset + 1;
                if (item.type === 'snapshot') {
                    data.override(item.data, this.crdtManager);
                } else if (item.type === 'event') {
                    this.handleEvent(item.event);
                } else {
                    softNever(item, 'observeBoard got an unknown event');
                }
            }
        }, `observeBoard, board id = ${dto.board.id}`).catch(error => {
            log.error({error, msg: 'observeBoard failed'});
        });

        return [data.boardTreeView, awareness, data.meView];
    }

    private createBoardAwareness(
        boardId: BoardId,
        initialMe: User,
        activityMonitor: ActivityMonitor
    ) {
        const awareness = new Awareness(createClientId(), activityMonitor);

        awareness.setLocalState({
            user: {name: initialMe.fullName},
            userId: initialMe.id,
            active: activityMonitor.active,
        });

        const awarenessSynchronizer = AwarenessSynchronizer.start(
            awareness,
            boardId,
            this.rpc
        );

        context().onEnd(reason => {
            awarenessSynchronizer.destroy(reason);
        });

        return awareness;
    }

    setProfileFullName(profileId: UserId, fullName: string): void {
        this.crdtManager.update<User>(profileId, x => {
            x.fullName = fullName;
        });
    }

    async createBoard(options: {
        name: string;
        memberEmails: string[];
    }): Promise<Board> {
        const board = await this.rpc.createBoard({
            boardId: createBoardId(),
            name: options.name,
            members: options.memberEmails,
        });

        return board;
    }

    createCardDraft(
        board: BoardTreeView,
        options: {columnId: ColumnId; placement: Placement}
    ): CardTreeView {
        const me = this.authManager.ensureAuthorized();
        const now = getNow();
        const cardId = createCardId();
        const cardCrdt = Crdt.from<Card>({
            authorId: me.userId,
            boardId: board.id,
            columnId: options.columnId,
            createdAt: now,
            id: cardId,
            assigneeId: me.userId,
            position: toPosition(options.placement),
            counter: null,
            pk: [cardId],
            updatedAt: now,
            text: createRichtext(),
        });
        const card = this.crdtManager.createDraft({
            id: cardId,
            state: cardCrdt.state(),
            type: 'card',
            isDraft: true,
        }).view as Card;

        this.syncTargets().forEach(x => {
            x.newCard(card);
        });

        const view = board.columns.flatMap(x =>
            x.cards.filter(x => x.id === cardId)
        )[0];
        assert(view !== undefined, 'expected card to be created');

        return view;
    }

    commitCardDraft(board: BoardTreeView, cardId: CardId) {
        const maxCounter = Math.max(
            0,
            ...board.columns.flatMap(x => x.cards.map(x => x.counter ?? 0))
        );
        this.crdtManager.update<Card>(cardId, x => {
            x.counter = maxCounter + 1;
        });
        const card: Card = this.crdtManager.commit(cardId);

        this.createCardCreatedMessage({
            boardId: board.id,
            cardId,
            columnId: board.columns[0].id,
            cardCreatedAt: card.createdAt,
        });
    }

    private createCardCreatedMessage(params: {
        boardId: BoardId;
        cardId: CardId;
        columnId: ColumnId;
        cardCreatedAt: Timestamp;
    }) {
        const me = this.authManager.ensureAuthorized();
        const now = getNow();
        const messageId = createMessageId();
        const messageCrdt = Crdt.from<Message>({
            authorId: me.userId,
            boardId: params.boardId,
            cardId: params.cardId,
            createdAt: now,
            target: 'card',
            columnId: params.columnId,
            id: messageId,
            attachmentIds: [],
            payload: {
                type: 'card_created',
                cardCreatedAt: params.cardCreatedAt,
                cardId: params.cardId,
            },
            replyToId: undefined,
            updatedAt: now,
            pk: [messageId],
        });
        const message = this.crdtManager.createDraft({
            id: messageId,
            state: messageCrdt.state(),
            type: 'message',
            isDraft: true,
        }).view as Message;

        this.crdtManager.commit(messageId);

        this.syncTargets().forEach(x => {
            x.newMessage(message);
        });
    }

    private createCardAssigneeChangedMessage(params: {
        boardId: BoardId;
        cardId: CardId;
        columnId: ColumnId;
        fromAssigneeId: UserId | undefined;
        toAssigneeId: UserId | undefined;
        cardAssigneeChangedAt: Timestamp;
    }) {
        const me = this.authManager.ensureAuthorized();
        const now = getNow();
        const messageId = createMessageId();
        const messageCrdt = Crdt.from<Message>({
            authorId: me.userId,
            boardId: params.boardId,
            cardId: params.cardId,
            createdAt: now,
            target: 'card',
            columnId: params.columnId,
            id: messageId,
            attachmentIds: [],
            payload: {
                type: 'card_assignee_changed',
                cardAssigneeChangedAt: params.cardAssigneeChangedAt,
                cardId: params.cardId,
                fromAssigneeId: params.fromAssigneeId,
                toAssigneeId: params.toAssigneeId,
            },
            replyToId: undefined,
            updatedAt: now,
            pk: [messageId],
        });
        const message = this.crdtManager.createDraft({
            id: messageId,
            state: messageCrdt.state(),
            type: 'message',
            isDraft: true,
        }).view as Message;

        this.crdtManager.commit(messageId);

        this.syncTargets().forEach(x => {
            x.newMessage(message);
        });
    }

    private createCardColumnChangedMessage(params: {
        boardId: BoardId;
        cardId: CardId;
        fromColumnId: ColumnId;
        toColumnId: ColumnId;
        fromColumnName: string;
        toColumnName: string;
        cardColumnChangedAt: Timestamp;
    }) {
        const me = this.authManager.ensureAuthorized();
        const now = getNow();
        const messageId = createMessageId();
        const messageCrdt = Crdt.from<Message>({
            authorId: me.userId,
            boardId: params.boardId,
            cardId: params.cardId,
            createdAt: now,
            target: 'card',
            columnId: params.toColumnId,
            id: messageId,
            attachmentIds: [],
            payload: {
                type: 'card_column_changed',
                cardColumnChangedAt: params.cardColumnChangedAt,
                cardId: params.cardId,
                fromColumnId: params.fromColumnId,
                toColumnId: params.toColumnId,
                fromColumnName: params.fromColumnName,
                toColumnName: params.toColumnName,
            },
            replyToId: undefined,
            updatedAt: now,
            pk: [messageId],
        });
        const message = this.crdtManager.createDraft({
            id: messageId,
            state: messageCrdt.state(),
            type: 'message',
            isDraft: true,
        }).view as Message;

        this.crdtManager.commit(messageId);

        this.syncTargets().forEach(x => {
            x.newMessage(message);
        });
    }

    private createCardDeletedMessage(params: {
        boardId: BoardId;
        cardId: CardId;
        columnId: ColumnId;
        cardDeletedAt: Timestamp;
    }) {
        const me = this.authManager.ensureAuthorized();
        const now = getNow();
        const messageId = createMessageId();
        const messageCrdt = Crdt.from<Message>({
            authorId: me.userId,
            boardId: params.boardId,
            cardId: params.cardId,
            createdAt: now,
            target: 'card',
            columnId: params.columnId,
            id: messageId,
            attachmentIds: [],
            payload: {
                type: 'card_deleted',
                cardDeletedAt: params.cardDeletedAt,
                cardId: params.cardId,
            },
            replyToId: undefined,
            updatedAt: now,
            pk: [messageId],
        });
        const message = this.crdtManager.createDraft({
            id: messageId,
            state: messageCrdt.state(),
            type: 'message',
            isDraft: true,
        }).view as Message;

        this.crdtManager.commit(messageId);

        this.syncTargets().forEach(x => {
            x.newMessage(message);
        });
    }

    createMessage(params: {
        boardId: BoardId;
        cardId: CardId;
        columnId: ColumnId;
        text: XmlFragment;
    }): Message | undefined {
        const me = this.authManager.ensureAuthorized();
        const now = getNow();
        const messageId = createMessageId();
        const messageCrdt = Crdt.from<Message>({
            authorId: me.userId,
            boardId: params.boardId,
            cardId: params.cardId,
            createdAt: now,
            target: 'card',
            columnId: params.columnId,
            id: messageId,
            attachmentIds: [],
            payload: {
                type: 'text',
                text: createRichtext(params.text.clone()),
            },
            replyToId: undefined,
            updatedAt: now,
            pk: [messageId],
        });
        const message = this.crdtManager.createDraft({
            id: messageId,
            state: messageCrdt.state(),
            type: 'message',
            isDraft: true,
        }).view as Message;

        this.crdtManager.commit(messageId);

        this.syncTargets().forEach(x => {
            x.newMessage(message);
        });

        return message;
    }

    finalizeCardPosition(cardId: CardId): void {
        const board = this.activeBoards.find(
            x =>
                x.considerCardPosition.has(cardId) &&
                x.considerColumnId.has(cardId)
        );
        assert(board !== undefined, 'finalize card position: board not found');
        const toColumnId = board.considerColumnId.get(cardId);
        assert(
            toColumnId !== undefined,
            'finalize card position: columnId not found'
        );
        const position = board.considerCardPosition.get(cardId);
        assert(
            position !== undefined,
            'finalize card position: position not found'
        );

        const card = this.crdtManager.viewById(cardId, 'card');
        const fromColumnId = card.columnId;
        const fromColumn = this.crdtManager.viewById(fromColumnId, 'column');
        const toColumn = this.crdtManager.viewById(toColumnId, 'column');

        this.crdtManager.update<Card>(cardId, x => {
            x.position = position;
            x.columnId = toColumnId;
        });

        this.createCardColumnChangedMessage({
            boardId: card.boardId,
            cardColumnChangedAt: getNow(),
            cardId,
            fromColumnId,
            toColumnId,
            fromColumnName: fromColumn.name,
            toColumnName: toColumn.name,
        });

        this.clearCardConsider(cardId);
    }

    clearCardConsider(cardId: CardId) {
        this.activeBoards.forEach(x => {
            x.cardDragSettledAt.delete(cardId);
            x.considerCardPosition.delete(cardId);
            x.considerColumnId.delete(cardId);
        });
    }

    // todo: this logic seems shit
    finalizeColumnPosition(columnId: ColumnId): void {
        const board = this.activeBoards.find(x =>
            x.considerColumnPosition.has(columnId)
        );
        assert(
            board !== undefined,
            'finalize column position: board not found'
        );
        const position = board.considerColumnPosition.get(columnId);
        assert(
            position !== undefined,
            'finalize column position: position not found'
        );

        this.crdtManager.update<Column>(columnId, x => {
            x.position = position;
        });

        this.clearColumnConsider(columnId);
    }

    clearColumnConsider(columnId: ColumnId) {
        this.activeBoards.forEach(x => {
            x.columnDragSettledAt.delete(columnId);
            x.considerColumnPosition.delete(columnId);
        });
    }

    considerCardPosition(cardId: CardId, columnId: ColumnId, position: number) {
        const now = getNow();
        this.activeBoards.forEach(board => {
            board.considerColumnId.set(cardId, columnId);
            board.considerCardPosition.set(cardId, position);
            board.cardDragSettledAt.set(cardId, now);
        });
    }

    considerColumnPosition(columnId: ColumnId, position: number) {
        const now = getNow();
        this.activeBoards.forEach(board => {
            board.considerColumnPosition.set(columnId, position);
            board.columnDragSettledAt.set(columnId, now);
        });
    }

    setCardColumn(cardId: CardId, columnId: ColumnId): void {
        const card = this.crdtManager.viewById(cardId, 'card');
        const board = this.activeBoards.find(
            x => x.boardView.id === card.boardId
        );
        assert(board !== undefined, 'set card column: board not found');
        const targetColumnIndex = board.columnTreeViews.findIndex(
            x => x.id === columnId
        );
        assert(
            targetColumnIndex !== -1,
            'set card column: columnId not found in board'
        );
        const sourceColumnIndex = board.columnTreeViews.findIndex(
            x => x.id === card.columnId
        );
        assert(
            sourceColumnIndex !== -1,
            'set card column: source columnId not found in board'
        );

        this.crdtManager.update<Card>(cardId, x => {
            x.columnId = columnId;
            if (sourceColumnIndex > targetColumnIndex) {
                x.position = toPosition({
                    next: board.columnTreeViews[targetColumnIndex].cards.at(0)
                        ?.position,
                });
            }
            if (sourceColumnIndex < targetColumnIndex) {
                x.position = toPosition({
                    next: board.columnTreeViews[targetColumnIndex].cards.at(0)
                        ?.position,
                });
            }
        });

        this.createCardColumnChangedMessage({
            boardId: card.boardId,
            cardColumnChangedAt: getNow(),
            cardId,
            fromColumnId: card.columnId,
            toColumnId: columnId,
            fromColumnName: board.columnTreeViews[sourceColumnIndex].name,
            toColumnName: board.columnTreeViews[targetColumnIndex].name,
        });

        this.clearCardConsider(cardId);
    }

    setCardAssignee(cardId: CardId, assigneeId: UserId | undefined): void {
        const card = this.crdtManager.viewById(cardId, 'card');
        const fromAssigneeId = card.assigneeId;
        this.crdtManager.update<Card>(cardId, x => {
            x.assigneeId = assigneeId;
        });

        this.createCardAssigneeChangedMessage({
            boardId: card.boardId,
            cardId,
            columnId: card.columnId,
            fromAssigneeId,
            toAssigneeId: assigneeId,
            cardAssigneeChangedAt: getNow(),
        });
    }

    createColumn(options: {
        boardId: BoardId;
        name: string;
        placement: Placement;
    }): Column {
        const me = this.authManager.ensureAuthorized();
        const now = getNow();
        const columnId = createColumnId();
        const columnCrdt = Crdt.from<Column>({
            authorId: me.userId,
            boardId: options.boardId,
            createdAt: now,
            id: columnId,
            name: options.name,
            position: toPosition(options.placement),
            pk: [columnId],
            updatedAt: now,
        });
        const column = this.crdtManager.createDraft({
            id: columnId,
            state: columnCrdt.state(),
            type: 'column',
            isDraft: true,
        }).view as Column;
        this.crdtManager.commit(columnId);

        this.syncTargets().forEach(x => {
            x.newColumn(column);
        });

        return column;
    }

    setColumnName(columnId: ColumnId, name: string): void {
        this.crdtManager.update<Column>(columnId, x => {
            x.name = name;
        });
    }

    deleteColumn(columnId: ColumnId): void {
        this.crdtManager.update<Column>(columnId, x => {
            x.deletedAt = getNow();
        });
    }

    deleteCard(cardId: CardId): void {
        const deletedAt = getNow();
        this.crdtManager.update<Card>(cardId, x => {
            x.deletedAt = deletedAt;
        });
        const card = this.crdtManager.viewById(cardId, 'card') as Card;
        this.createCardDeletedMessage({
            boardId: card.boardId,
            cardId: card.id,
            columnId: card.columnId,
            cardDeletedAt: deletedAt,
        });
    }

    deleteMessage(messageId: MessageId): void {
        this.crdtManager.update<Message>(messageId, x => {
            x.deletedAt = getNow();
        });
    }

    setBoardName(boardId: BoardId, name: string): void {
        this.crdtManager.update<Board>(boardId, x => {
            x.name = name;
        });
    }

    deleteBoard(boardId: BoardId): void {
        this.crdtManager.update<Board>(boardId, x => {
            x.deletedAt = getNow();
        });
    }

    createMember(boardId: BoardId, email: string, role: MemberRole) {
        const transactionId = createTransactionId();
        this.rpc
            .createMember({boardId, email, role}, {transactionId})
            .catch(error => {
                log.error({error, msg: 'createMember failed'});
            });
    }

    updateMemberRole(memberId: MemberId, role: MemberRole) {
        const transactionId = createTransactionId();
        this.rpc
            .updateMemberRole({memberId, role}, {transactionId})
            .catch(error => {
                log.error({error, msg: 'updateMemberRole failed'});
            });
    }

    deleteMember(memberId: MemberId) {
        const transactionId = createTransactionId();
        this.rpc.deleteMember({memberId}, {transactionId}).catch(error => {
            log.error({error, msg: 'deleteMember failed'});
        });
    }

    private handleEvent(event: ChangeEvent) {
        if (event.kind === 'create') {
            const view = this.crdtManager.view({
                id: event.id,
                type: event.type,
                state: event.diff,
            } as EntityState);

            if (event.type === 'user') {
                const user = view as User;

                // we need to check channel to avoid adding new entity before dependencies are ready
                // each channel would initialize its own dependencies before adding a new entity
                this.syncTargets().forEach(x => x.newUser(user));
            } else if (event.type === 'column') {
                const column = view as Column;
                this.syncTargets().forEach(x => x.newColumn(column));
            } else if (event.type === 'card') {
                const card = view as Card;
                this.syncTargets().forEach(x => x.newCard(card));
            } else if (event.type === 'board') {
                const board = view as Board;
                this.syncTargets().forEach(x => x.newBoard(board));
            } else if (event.type === 'attachment') {
                const attachment = view as Attachment;
                this.syncTargets().forEach(x => x.newAttachment(attachment));
            } else if (event.type === 'message') {
                const message = view as Message;
                this.syncTargets().forEach(x => x.newMessage(message));
            } else if (event.type === 'account') {
                const account = view as Account;
                this.syncTargets().forEach(x => x.newAccount(account));
            } else if (event.type === 'member') {
                const member = view as Member;
                this.syncTargets().forEach(x => x.newMember(member));
            } else {
                softNever(event, 'observeBoard got an unknown event');
            }
        } else if (event.kind === 'update') {
            this.crdtManager.applyRemoteChange(event);
        } else if (event.kind === 'snapshot') {
            this.syncTargets().forEach(x => x.upsertMemberInfo(event.info));
        } else if (event.kind === 'transaction') {
            // cleanup optimistic state
        } else {
            assertNever(event.kind);
        }
    }
}

export function createAgent(
    client: TransportClient<unknown>,
    authManager: AuthManager,
    contextManager: ContextManager,
    activityMonitor: ActivityMonitor
) {
    const existingAgent = getContext(Agent);
    assert(existingAgent === undefined, 'Syncwave agent already exists');

    const agent = new Agent(
        client,
        authManager,
        contextManager,
        activityMonitor
    );
    setContext(Agent, agent);
    onDestroy(() => agent.close('agent.close: component destroyed'));

    $effect(() => {
        const listener = (e: BeforeUnloadEvent) => {
            alert('unload');
            if (!agent.isSettled()) {
                e.preventDefault();
                e.returnValue = ''; // old Chrome requires returnValue to be set
            }
        };
        window.addEventListener('beforeunload', listener);

        return () => {
            window.removeEventListener('beforeunload', listener);
        };
    });
}

export function getAgent() {
    const agent: Agent = getContext(Agent);
    assert(agent !== undefined, 'Syncwave agent not found');
    assert(
        agent instanceof Agent,
        'Syncwave agent must be an instance of Agent class'
    );
    return agent;
}
