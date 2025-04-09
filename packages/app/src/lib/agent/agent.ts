import {getContext, onDestroy, setContext} from 'svelte';
import {
    assert,
    assertNever,
    Awareness,
    context,
    Crdt,
    createBoardId,
    createCardId,
    createClientId,
    createCoordinatorApi,
    createRichtext,
    createRpcClient,
    getNow,
    infiniteRetry,
    log,
    PersistentConnection,
    RpcConnection,
    softNever,
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
    type CardTreeViewDataDto,
    type ChangeEvent,
    type Column,
    type ColumnId,
    type CoordinatorRpc,
    type CrdtDoc,
    type Member,
    type Message,
    type MeViewDataDto,
    type Placement,
    type TransportClient,
    type User,
    type UserId,
} from 'syncwave';

import type {AuthManager} from '../../auth-manager';

import {getDocumentActivity} from '../../document-activity';
import {AwarenessSynchronizer} from './awareness-synchronizer';
import {useComponentContext} from './component-context';
import {CrdtManager, type EntityState} from './crdt-manager';
import {
    BoardData,
    BoardTreeView,
    CardTreeView,
    CardTreeViewData,
    CardView,
    createSyncChannelId,
    MeViewData,
    UserView,
    type SyncChannelId,
    type SyncTarget,
} from './view.svelte';

export class Agent {
    private crdtManager: CrdtManager;
    private readonly connection: RpcConnection;
    public readonly rpc: CoordinatorRpc;

    private activeBoards: BoardData[] = [];
    private activeMes: MeViewData[] = [];
    private activeCards: CardTreeViewData[] = [];

    private syncTargets(syncChannelId: SyncChannelId): SyncTarget[] {
        return [
            ...this.activeBoards,
            ...this.activeCards,
            ...this.activeMes,
        ].filter(x => x.syncChannelId === syncChannelId);
    }

    constructor(
        client: TransportClient<unknown>,
        private readonly authManager: AuthManager
    ) {
        this.connection = new RpcConnection(new PersistentConnection(client));

        this.rpc = createRpcClient(
            createCoordinatorApi(),
            this.connection,
            () => ({
                ...context().extract(),
                auth: this.authManager.getJwt() ?? undefined,
            })
        );
        this.crdtManager = new CrdtManager(this.rpc);
    }

    async sendSignInEmail(email: string) {
        return await this.rpc.sendSignInEmail({email});
    }

    close(reason: unknown) {
        this.rpc.close(reason);
        this.crdtManager.close(reason);
        this.connection.close(reason);
    }

    handleCardMouseEnter(boardId: BoardId, cardId: CardId) {
        const board = this.activeBoards.find(x => x.boardView.id === boardId);
        assert(board !== undefined, 'board not found');
        board.rawAwareness.setLocalStateField('hoverCardId', cardId);
    }

    handleCardMouseLeave(boardId: BoardId, cardId: CardId) {
        const board = this.activeBoards.find(x => x.boardView.id === boardId);
        assert(board !== undefined, 'board not found');
        if (board.rawAwareness.getLocalState()?.hoverCardId === cardId) {
            board.rawAwareness.setLocalStateField('hoverCardId', undefined);
        }
    }

    async observeMeAsync() {
        const ctx = useComponentContext();

        const me = await this.rpc
            .getMeViewData({})
            .filter(x => x.type === 'snapshot')
            .map(x => x.data)
            .first();

        return ctx.run(() => this.observeMe(me));
    }

    private observeMe(initialMe: MeViewDataDto): UserView {
        const channelId = createSyncChannelId();
        const data = MeViewData.create(initialMe, this.crdtManager, channelId);

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
                    this.handleEvent(item.event, channelId);
                } else {
                    softNever(item, 'observeBoard got an unknown event');
                }
            }
        }, 'observeMe').catch(error => {
            log.error({error, msg: 'observeMe failed'});
        });

        return data.profileView;
    }

    async observeBoardAsync(key: string) {
        const ctx = useComponentContext();

        const activityMonitor = getDocumentActivity();

        const [board, me] = await whenAll([
            this.rpc
                .getBoardViewData({key})
                .filter(x => x.type === 'snapshot')
                .map(x => x.data)
                .first(),
            this.rpc
                .getMe({})
                .map(x => x.user)
                .first(),
        ]);

        return ctx.run(() => this.observeBoard(board, me, activityMonitor));
    }

    private observeBoard(
        dto: BoardViewDataDto,
        initialMe: CrdtDoc<User>,
        activityMonitor: ActivityMonitor
    ): [BoardTreeView, Awareness] {
        const awareness = this.createBoardAwareness(
            dto.board.id,
            initialMe,
            activityMonitor
        );
        const me = this.crdtManager.view({
            id: initialMe.id,
            isDraft: false,
            state: initialMe.state,
            type: 'user',
        });
        const channelId = createSyncChannelId();
        const data = BoardData.create(
            awareness,
            me,
            dto,
            this.crdtManager,
            channelId
        );

        this.activeBoards.push(data);
        context().onEnd(() => {
            this.activeBoards = this.activeBoards.filter(x => x !== data);
        });

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
                    this.handleEvent(item.event, channelId);
                } else {
                    softNever(item, 'observeBoard got an unknown event');
                }
            }
        }, `observeBoard, board id = ${dto.board.id}`).catch(error => {
            log.error({error, msg: 'observeBoard failed'});
        });

        return [data.boardTreeView, awareness];
    }

    private createBoardAwareness(
        boardId: BoardId,
        initialMe: CrdtDoc<User>,
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
        key: string;
        name: string;
        memberEmails: string[];
    }): Promise<BoardId> {
        const board = await this.rpc.createBoard({
            boardId: createBoardId(),
            key: options.name,
            name: options.name,
            members: options.memberEmails,
        });

        return board.id;
    }

    createCardDraft(
        board: BoardTreeView,
        options: {columnId: ColumnId; placement: Placement}
    ): CardView {
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

        this.activeBoards
            .filter(x => x.boardView.id === board.id)
            .forEach(x => {
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
        this.crdtManager.commit(cardId);
    }

    setColumnPosition(columnId: ColumnId, position: number): void {
        this.crdtManager.update<Column>(columnId, x => {
            x.position = position;
        });
    }

    finalizeCardPosition(cardId: CardId): void {
        const board = this.activeBoards.find(
            x =>
                x.considerCardPosition.has(cardId) &&
                x.considerColumnId.has(cardId)
        );
        assert(board !== undefined, 'finalize card position: board not found');
        const columnId = board.considerColumnId.get(cardId);
        assert(
            columnId !== undefined,
            'finalize card position: columnId not found'
        );
        const position = board.considerCardPosition.get(cardId);
        assert(
            position !== undefined,
            'finalize card position: position not found'
        );

        this.crdtManager.update<Card>(cardId, x => {
            x.position = position;
            x.columnId = columnId;
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

    considerCardPosition(cardId: CardId, columnId: ColumnId, position: number) {
        this.activeBoards.forEach(board =>
            board.considerColumnId.set(cardId, columnId)
        );
        this.activeBoards.forEach(board =>
            board.considerCardPosition.set(cardId, position)
        );

        const now = getNow();
        this.activeBoards.forEach(x => x.cardDragSettledAt.set(cardId, now));
    }

    setCardColumn(cardId: CardId, columnId: ColumnId): void {
        this.crdtManager.update<Card>(cardId, x => {
            x.columnId = columnId;
        });

        this.clearCardConsider(cardId);
    }

    setCardAssignee(cardId: CardId, assigneeId: UserId | undefined): void {
        this.crdtManager.update<Card>(cardId, x => {
            x.assigneeId = assigneeId;
        });
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
        this.crdtManager.update<Card>(cardId, x => {
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

    async observeCardAsync(cardId: CardId) {
        const ctx = useComponentContext();

        const dto = await this.rpc
            .getCardViewData({cardId})
            .filter(x => x.type === 'snapshot')
            .map(x => x.data)
            .first();

        return ctx.run(() => this.observeCard(dto));
    }

    private observeCard(dto: CardTreeViewDataDto): CardTreeView {
        const channelId = createSyncChannelId();
        const cardData = CardTreeViewData.create(
            dto,
            this.crdtManager,
            channelId
        );

        this.activeCards.push(cardData);
        context().onEnd(() => {
            this.activeCards = this.activeCards.filter(x => x !== cardData);
        });

        let nextOffset: number | undefined = undefined;

        infiniteRetry(async () => {
            const items = toStream(
                this.rpc.getCardViewData({
                    cardId: dto.card.id,
                    startOffset: nextOffset,
                })
            );

            for await (const item of items) {
                nextOffset = item.offset + 1;
                if (item.type === 'snapshot') {
                    cardData.override(item.data, this.crdtManager);
                } else if (item.type === 'event') {
                    this.handleEvent(item.event, channelId);
                } else {
                    softNever(item, 'observeBoard got an unknown event');
                }
            }
        }, 'observeMe').catch(error => {
            log.error({error, msg: 'observeCard failed'});
        });

        return cardData.cardView;
    }

    private handleEvent(event: ChangeEvent, syncChannelId: SyncChannelId) {
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
                this.syncTargets(syncChannelId).forEach(x => x.newUser(user));
            } else if (event.type === 'column') {
                const column = view as Column;
                this.syncTargets(syncChannelId).forEach(x =>
                    x.newColumn(column)
                );
            } else if (event.type === 'card') {
                const card = view as Card;
                this.syncTargets(syncChannelId).forEach(x => x.newCard(card));
            } else if (event.type === 'board') {
                const board = view as Board;
                this.syncTargets(syncChannelId).forEach(x => x.newBoard(board));
            } else if (event.type === 'attachment') {
                const attachment = view as Attachment;
                this.syncTargets(syncChannelId).forEach(x =>
                    x.newAttachment(attachment)
                );
            } else if (event.type === 'message') {
                const message = view as Message;
                this.syncTargets(syncChannelId).forEach(x =>
                    x.newMessage(message)
                );
            } else if (event.type === 'account') {
                const account = view as Account;
                this.syncTargets(syncChannelId).forEach(x =>
                    x.newAccount(account)
                );
            } else if (event.type === 'member') {
                const member = view as Member;
                this.syncTargets(syncChannelId).forEach(x =>
                    x.newMember(member)
                );
            } else {
                softNever(event, 'observeBoard got an unknown event');
            }
        } else if (event.kind === 'update') {
            this.crdtManager.applyRemoteChange(event);
        } else {
            assertNever(event.kind);
        }
    }
}

export function createAgent(
    client: TransportClient<unknown>,
    authManager: AuthManager
) {
    const existingAgent = getContext(Agent);
    assert(existingAgent === undefined, 'Syncwave agent already exists');

    const agent = new Agent(client, authManager);
    setContext(Agent, agent);
    onDestroy(() => agent.close('agent.close: component destroyed'));
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
