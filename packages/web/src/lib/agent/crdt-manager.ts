/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	assert,
	assertNever,
	Crdt,
	runAll,
	Uuid,
	type BaseChangeEvent,
	type ChangeEvent,
	type CoordinatorRpc,
	type CrdtDiff,
	type Recipe,
	type Unsubscribe,
} from 'syncwave-data';
import {deriveCrdtSnapshot} from './crdt.svelte.js';
import type {State} from './state.js';

export interface CrdtDerivator {
	derive(diff: EntityState): State<any>;
}

interface BaseEntity<TType extends string, TId extends Uuid, TValue> {
	readonly type: TType;
	readonly id: TId;
	readonly crdt: Crdt<TValue>;
}

class DiffPusher<T> {
	private queue: CrdtDiff<T>[] = [];
	private inProgress = false;

	constructor(
		private readonly rpc: CoordinatorRpc,
		private readonly entity: Entity
	) {}

	async enqueue(diff: CrdtDiff<T>) {
		this.queue.push(diff);
		if (!this.inProgress) {
			try {
				this.inProgress = true;
				while (this.queue.length > 0) {
					const batch = Crdt.merge(this.queue);
					this.queue = [];

					await this.send(batch);
				}
			} finally {
				this.inProgress = false;
			}
		}
	}

	private async send(diff: CrdtDiff<any>) {
		if (this.entity.type === 'card') {
			await this.rpc.applyCardDiff({
				cardId: this.entity.id,
				diff,
			});
		} else if (this.entity.type === 'user') {
			await this.rpc.applyUserDiff({
				userId: this.entity.id,
				diff,
			});
		} else if (this.entity.type === 'column') {
			await this.rpc.applyColumnDiff({
				columnId: this.entity.id,
				diff,
			});
		} else if (this.entity.type === 'board') {
			await this.rpc.applyBoardDiff({
				boardId: this.entity.id,
				diff,
			});
		} else if (this.entity.type === 'attachment') {
			throw new Error('Attachment diff not supported');
		} else if (this.entity.type === 'identity') {
			throw new Error('Identity diff not supported');
		} else if (this.entity.type === 'member') {
			throw new Error('Member diff not supported');
		} else if (this.entity.type === 'message') {
			throw new Error('Message diff not supported');
		} else {
			assertNever(this.entity);
		}
	}
}

interface BaseEntityState<TType extends string, TId extends Uuid, TValue> {
	readonly type: TType;
	readonly id: TId;
	readonly state: CrdtDiff<TValue>;
}

type Entity = ChangeEvent extends infer T
	? T extends BaseChangeEvent<infer TType, infer TId, infer TValue>
		? BaseEntity<TType, TId, TValue>
		: never
	: never;

type EntityState = ChangeEvent extends infer T
	? T extends BaseChangeEvent<infer TType, infer TId, infer TValue>
		? BaseEntityState<TType, TId, TValue>
		: never
	: never;

class CrdtRegistry {
	private readonly entities = new Map<Uuid, Entity>();
	private readonly observers = new Map<Uuid, Unsubscribe>();

	constructor(private readonly rpc: CoordinatorRpc) {}

	applyChangeEvent(event: ChangeEvent) {
		const entity = this.entities.get(event.id);
		if (entity === undefined) return;

		assert(entity.type === event.type, 'apply: Crdt type mismatch');
		entity.crdt.apply(event.diff as CrdtDiff<any>);
	}

	load({id, type, state}: EntityState) {
		const entity = this.entities.get(id);
		if (entity) {
			assert(entity.type === type, 'load: Crdt type mismatch');
			entity.crdt.apply(state as CrdtDiff<any>);
		} else {
			this.entities.set(id, {
				crdt: Crdt.load(state as CrdtDiff<any>),
				id,
				type,
			} as Entity);
		}
	}

	get(id: Uuid) {
		const result = this.entities.get(id);
		assert(result !== undefined, 'Crdt not found');

		if (!this.observers.has(id)) {
			this.observe(id, result);
		}

		return result.crdt;
	}

	private observe(id: Uuid, entity: Entity) {
		if (this.observers.has(id)) return;
		const pusher = new DiffPusher(this.rpc, entity);

		const unsub = entity.crdt.onUpdate(diff => {
			pusher.enqueue(diff);
		});

		this.observers.set(id, reason => {
			unsub(reason);
		});
	}

	close(reason: unknown) {
		runAll([...this.observers.values()].map(fn => () => fn(reason)));
	}
}

export class CrdtManager {
	private readonly registry: CrdtRegistry;
	private readonly snapshots: Unsubscribe[] = [];

	constructor(rpc: CoordinatorRpc) {
		this.registry = new CrdtRegistry(rpc);
	}

	applyChange(event: ChangeEvent) {
		this.registry.applyChangeEvent(event);
	}

	derive(state: EntityState): State<any> {
		this.registry.load(state);
		const [snapshot, unsub] = deriveCrdtSnapshot<any>(
			this.registry.get(state.id)
		);
		this.snapshots.push(unsub);
		return snapshot;
	}

	update<T>(id: Uuid, recipe: Recipe<T>) {
		const crdt = this.registry.get(id) as Crdt<T>;
		const diff = crdt.update(recipe);

		return diff;
	}

	close(reason: unknown) {
		runAll([
			() => this.registry.close(reason),
			...this.snapshots.map(fn => () => fn(reason)),
		]);
	}
}
