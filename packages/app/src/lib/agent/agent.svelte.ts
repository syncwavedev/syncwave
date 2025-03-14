import type {AuthManager} from '$lib/auth-manager';
import {getRpc} from '$lib/utils';
import {getContext, onDestroy, setContext} from 'svelte';
import {
	assert,
	assertNever,
	context,
	Crdt,
	createCardId,
	createClientId,
	createCoordinatorApi,
	createRichtext,
	createRpcClient,
	Deferred,
	getNow,
	log,
	PersistentConnection,
	RpcConnection,
	softNever,
	toError,
	toPosition,
	toStream,
	tracerManager,
	type BigFloat,
	type Board,
	type BoardId,
	type BoardViewDataDto,
	type Card,
	type CardId,
	type ChangeEvent,
	type Column,
	type ColumnId,
	type CoordinatorRpc,
	type Placement,
	type TransportClient,
	type User,
	type UserId,
} from 'syncwave-data';
import {
	Awareness,
	type AwarenessState,
} from '../../../../data/dist/esm/src/awareness';
import {BatchProcessor} from './batch-processor';
import {CrdtManager, type EntityState} from './crdt-manager';
import type {State} from './state';
import {BoardData, BoardTreeView, CardView, UserView} from './view.svelte';

class Agent {
	private crdtManager: CrdtManager;
	private readonly connection: RpcConnection;
	public readonly rpc: CoordinatorRpc;

	private activeBoards: BoardData[] = [];

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
				auth: this.authManager.getJwt(),
			}),
			'server',
			tracerManager.get('agent')
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

	observeBoard(initial: BoardViewDataDto): [BoardTreeView, Awareness] {
		const data = BoardData.create(initial, this.crdtManager);

		this.activeBoards.push(data);
		onDestroy(
			() =>
				(this.activeBoards = this.activeBoards.filter(x => x !== data))
		);

		const rpc = getRpc();
		$effect(() => {
			(async () => {
				const items = toStream(
					rpc(x => x.getBoardViewData({key: initial.board.key}))
				);
				for await (const item of items) {
					if (item.type === 'snapshot') {
						data.update(item.data, this.crdtManager);
					} else if (item.type === 'event') {
						this.handleEvent(item.event);
					} else {
						softNever(item, 'observeBoard got an unknown event');
					}
				}
			})().catch(error => {
				log.error(toError(error), 'observeBoard failed');
			});
		});

		const awareness = new Awareness(createClientId());

		const destroySignal = new Deferred<void>();
		onDestroy(() => {
			destroySignal.resolve();
		});

		const awarenessSender = new BatchProcessor<AwarenessState>(
			{type: 'running'},
			async (states: AwarenessState[]) => {
				await rpc(x =>
					x.updateBoardAwarenessState({
						clientId: awareness.clientId,
						boardId: initial.board.id,
						state: states.at(-1) ?? null,
					})
				);
			}
		);

		async function startAwarenessPull() {
			const handleUpdate = (_: unknown, origin: unknown) => {
				if (origin !== 'local') return;

				awarenessSender
					.enqueue(awareness.getLocalState())
					.catch(error => {
						log.error(
							toError(error),
							'failed to enqueue awareness state'
						);
					});
			};

			awareness.on('update', handleUpdate);
			destroySignal.promise.then(() => {
				awareness.off('update', handleUpdate);
			});

			await rpc(x =>
				x.updateBoardAwarenessState({
					clientId: awareness.clientId,
					boardId: initial.board.id,
					state: awareness.getLocalState(),
				})
			);
		}

		$effect(() => {
			(async () => {
				const updates = rpc(x =>
					x.joinBoardAwareness({
						boardId: initial.board.id,
						state: awareness.getLocalState(),
						clientId: awareness.clientId,
					})
				);

				let initialized = false;
				for await (const update of updates) {
					awareness.applyRemote(
						update.states.map(({clientId, state}) => ({
							key: clientId,
							value: state,
						}))
					);

					if (!initialized) {
						initialized = true;
						startAwarenessPull().catch(error => {
							log.error(toError(error), 'awareness pull failed');
						});
					}
				}
			})().catch(error => {
				log.error(toError(error), 'observeBoard awareness failed');
			});
		});

		return [data.view, awareness];
	}

	observeProfile(initial: User): UserView {
		const view = new UserView(initial);

		const rpc = getRpc();
		$effect(() => {
			(async () => {
				const items = toStream(
					rpc(x => x.getProfileData({userId: initial.id}))
				);
				for await (const item of items) {
					if (item.type === 'snapshot') {
						const user = this.crdtManager.view({
							id: item.data.user.id,
							state: item.data.user.state,
							type: 'user',
							isDraft: false,
						}).value;
						view.update(user);
					} else if (item.type === 'event') {
						this.handleEvent(item.event);
					} else {
						softNever(item, 'observeBoard got an unknown event');
					}
				}
			})().catch(error => {
				log.error(toError(error), 'observeBoard failed');
			});
		});

		return view;
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
			deleted: false,
			id: cardId,
			columnPosition: toPosition(options.placement),
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
			.filter(x => x.board.id === board.id)
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

	setColumnPosition(columnId: ColumnId, position: BigFloat): void {
		this.crdtManager.update<Column>(columnId, x => {
			x.boardPosition = position;
		});
	}

	setCardPosition(
		cardId: CardId,
		columnId: ColumnId,
		position: BigFloat
	): void {
		this.crdtManager.update<Card>(cardId, x => {
			x.columnPosition = position;
			x.columnId = columnId;
		});
	}

	setColumnName(columnId: ColumnId, name: string): void {
		this.crdtManager.update<Column>(columnId, x => {
			x.name = name;
		});
	}

	deleteColumn(columnId: ColumnId): void {
		this.crdtManager.update<Column>(columnId, x => {
			x.deleted = true;
		});
	}

	setBoardName(boardId: BoardId, name: string): void {
		this.crdtManager.update<Board>(boardId, x => {
			x.name = name;
		});
	}

	deleteBoard(boardId: BoardId): void {
		this.crdtManager.update<Board>(boardId, x => {
			x.deleted = true;
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
				event.type === 'identity' ||
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
