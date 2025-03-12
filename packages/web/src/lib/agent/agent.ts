import {browser} from '$app/environment';
import {getSdk} from '$lib/utils';
import {getContext, setContext} from 'svelte';
import {
	assert,
	context,
	createCoordinatorApi,
	createRpcClient,
	log,
	PersistentConnection,
	RpcConnection,
	softNever,
	toError,
	toStream,
	tracerManager,
	type BigFloat,
	type BoardViewDataDto,
	type Card,
	type CardId,
	type Column,
	type ColumnId,
	type CoordinatorRpc,
	type TransportClient,
} from 'syncwave-data';
import {CrdtManager} from './crdt-manager';
import {BoardData, BoardTreeView} from './view.svelte';

class Agent {
	// todo: fix leaks
	private crdtManager: CrdtManager;
	private readonly connection: RpcConnection;
	public readonly rpc: CoordinatorRpc;
	constructor(client: TransportClient<unknown>, jwt: string | undefined) {
		this.connection = new RpcConnection(new PersistentConnection(client));

		this.rpc = createRpcClient(
			createCoordinatorApi(),
			this.connection,
			() => ({
				...context().extract(),
				auth: jwt,
			}),
			'server',
			tracerManager.get('part')
		);
		this.crdtManager = new CrdtManager(this.rpc);
	}

	observeBoard(boardKey: string, initial: BoardViewDataDto): BoardTreeView {
		const data = BoardData.create(initial, this.crdtManager);

		const sdk = getSdk();
		if (browser) {
			(async () => {
				const items = toStream(
					sdk(x => x.getBoardViewData({key: boardKey}))
				);
				for await (const item of items) {
					if (item.type === 'snapshot') {
						data.update(item.data, this.crdtManager);
					} else if (item.type === 'event') {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						this.crdtManager.applyRemoteEvent<any>(
							item.event.id,
							item.event.diff
						);
					} else {
						softNever(item, 'observeBoard got an unknown event');
					}
				}
			})().catch(error => {
				log.error(toError(error), 'observeBoard failed');
			});
		}

		return data.view;
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
}

export function createAgent(
	client: TransportClient<unknown>,
	jwt: string | undefined
) {
	const existingAgent = getContext(Agent);
	assert(existingAgent === undefined, 'Syncwave agent already exists');

	const agent = new Agent(client, jwt);
	setContext(Agent, agent);
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
