import {getContext, onDestroy, setContext} from 'svelte';
import {
    assert,
    assertNever,
    Awareness,
    context,
    Crdt,
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
    toError,
    toPosition,
    toStream,
    whenAll,
    type ActivityMonitor,
    type Board,
    type BoardId,
    type BoardViewDataDto,
    type Card,
    type CardId,
    type ChangeEvent,
    type Column,
    type ColumnId,
    type CoordinatorRpc,
    type CrdtDoc,
    type MeViewDataDto,
    type Placement,
    type TransportClient,
    type User,
    type UserId,
} from 'syncwave';

import type {AuthManager} from '../../auth-manager';

import {getDocumentActivity} from '../../document-activity';
import {getRpc, type Rpc} from '../utils';
import {AwarenessSynchronizer} from './awareness-syncronizer';
import {setComponentContext} from './component-context';
import {CrdtManager, type EntityState} from './crdt-manager';
import type {State} from './state';
import {BoardData, BoardTreeView, CardView, MeView} from './view.svelte';

export class Agent {
    private crdtManager: CrdtManager;
    private readonly connection: RpcConnection;
    public readonly rpc: CoordinatorRpc;

    private activeBoards: BoardData[] = [];
    private activeMes: MeView[] = [];

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
        const ctx = setComponentContext();

        const rpc = getRpc();
        const me = await rpc(x =>
            x
                .getMeViewData({})
                .filter(x => x.type === 'snapshot')
                .map(x => x.data)
                .first()
        );

        return ctx.run(() => this.observeMe(me, rpc));
    }

    private observeMe(initialMe: MeViewDataDto, rpc: Rpc): MeView {
        const view = MeView.create(initialMe, this.crdtManager);

        this.activeMes.push(view);
        context().onEnd(() => {
            this.activeMes = this.activeMes.filter(x => x !== view);
        });

        let nextOffset: number | undefined = undefined;

        infiniteRetry(async () => {
            const items = toStream(
                rpc(x => x.getMeViewData({startOffset: nextOffset}))
            );

            for await (const item of items) {
                nextOffset = item.offset + 1;
                if (item.type === 'snapshot') {
                    view.update(item.data, this.crdtManager);
                } else if (item.type === 'event') {
                    this.handleEvent(item.event);
                } else {
                    softNever(item, 'observeBoard got an unknown event');
                }
            }
        }, 'observeMe').catch(error => {
            log.error({error: toError(error), msg: 'observeBoard failed'});
        });

        return view;
    }

    async observeBoardAsync(key: string) {
        const ctx = setComponentContext();

        const activityMonitor = getDocumentActivity();

        const rpc = getRpc();
        const [board, me] = await whenAll([
            rpc(x =>
                x
                    .getBoardViewData({key})
                    .filter(x => x.type === 'snapshot')
                    .map(x => x.data)
                    .first()
            ),
            rpc(x =>
                x
                    .getMe({})
                    .map(x => x.user)
                    .first()
            ),
        ]);

        return ctx.run(() =>
            this.observeBoard(board, me, rpc, activityMonitor)
        );
    }

    private observeBoard(
        initialBoard: BoardViewDataDto,
        initialMe: CrdtDoc<User>,
        rpc: Rpc,
        activityMonitor: ActivityMonitor
    ): [BoardTreeView, Awareness] {
        const awareness = this.createBoardAwareness(
            rpc,
            initialBoard.board.id,
            initialMe,
            activityMonitor
        );
        const me = this.crdtManager.view({
            id: initialMe.id,
            isDraft: false,
            state: initialMe.state,
            type: 'user',
        });
        const data = BoardData.create(
            awareness,
            me,
            initialBoard,
            this.crdtManager
        );

        this.activeBoards.push(data);
        context().onEnd(() => {
            this.activeBoards = this.activeBoards.filter(x => x !== data);
        });

        let nextOffset: number | undefined = undefined;

        infiniteRetry(async () => {
            const items = toStream(
                rpc(x =>
                    x.getBoardViewData({
                        key: initialBoard.board.key,
                        startOffset: nextOffset,
                    })
                )
            );

            for await (const item of items) {
                nextOffset = item.offset + 1;
                if (item.type === 'snapshot') {
                    data.update(item.data, this.crdtManager);
                } else if (item.type === 'event') {
                    this.handleEvent(item.event);
                } else {
                    softNever(item, 'observeBoard got an unknown event');
                }
            }
        }, `observeBoard, board id = ${initialBoard.board.id}`).catch(error => {
            log.error({error: toError(error), msg: 'observeBoard failed'});
        });

        return [data.boardTreeView, awareness];
    }

    private createBoardAwareness(
        rpc: Rpc,
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
            rpc
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
        }).view;

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

    private handleEvent(event: ChangeEvent) {
        if (event.kind === 'create') {
            const view = this.crdtManager.view({
                id: event.id,
                type: event.type,
                state: event.diff,
            } as EntityState);

            if (event.type === 'user') {
                const user = view as State<User>;
                this.activeBoards.forEach(x => x.newUser(user));
            } else if (event.type === 'column') {
                const column = view as State<Column>;
                this.activeBoards.forEach(x => x.newColumn(column));
            } else if (event.type === 'card') {
                const card = view as State<Card>;
                this.activeBoards.forEach(x => x.newCard(card));
            } else if (
                event.type === 'board' ||
                event.type === 'attachment' ||
                event.type === 'message' ||
                event.type === 'account' ||
                event.type === 'member'
            ) {
                // do nothing
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
