/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	assert,
	assertNever,
	Crdt,
	log,
	runAll,
	toError,
	Uuid,
	wait,
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
	view(state: EntityState): State<any>;
}

interface BaseEntity<TType extends string, TId extends Uuid, TValue> {
	readonly type: TType;
	readonly id: TId;
	readonly crdt: Crdt<TValue>;
}

class DiffSender<T> {
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
					const batch = this.queue.slice();
					this.queue = [];
					try {
						await this.send(Crdt.merge(batch));
					} catch (error) {
						this.queue.push(...batch);

						log.error(toError(error), 'CrdtManager: send error');
						await wait({ms: 1000, onCancel: 'reject'});
					}
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

interface EntityObserver {
	sender: DiffSender<any>;
	close: Unsubscribe;
}

interface EntityBox {
	entity: Entity;
	view: State<any>;
	viewUnsub: Unsubscribe;
	observer: EntityObserver;
}

export type EntityState = ChangeEvent extends infer T
	? T extends BaseChangeEvent<infer TType, infer TId, infer TValue>
		? BaseEntityState<TType, TId, TValue>
		: never
	: never;

export class CrdtManager implements CrdtDerivator {
	private readonly entities = new Map<Uuid, EntityBox>();

	constructor(private readonly rpc: CoordinatorRpc) {}

	applyChange(event: ChangeEvent) {
		if (event.kind === 'create') {
			this.load({
				id: event.id,
				state: event.diff,
				type: event.type,
			} as EntityState);
		} else if (event.kind === 'update') {
			const entity = this.entities.get(event.id)?.entity;
			assert(entity !== undefined, 'apply: Crdt not found');
			assert(entity.type === event.type, 'apply: Crdt type mismatch');
			entity.crdt.apply(event.diff as CrdtDiff<any>);
		} else {
			assertNever(event.kind);
		}
	}

	view(state: EntityState): State<any> {
		return this.load(state).view;
	}

	create(entity: EntityState) {
		const existing = this.entities.get(entity.id);
		assert(existing === undefined, 'create: Crdt already exists');
		const box = this.load(entity);

		box.observer.sender.enqueue(box.entity.crdt.state());

		return box;
	}

	update<T>(id: Uuid, recipe: Recipe<T>) {
		const crdt = this.entities.get(id)?.entity.crdt;
		assert(crdt !== undefined, 'Crdt not found');
		const diff = (crdt as Crdt<T>).update(recipe);

		return diff;
	}

	close(reason: unknown) {
		runAll(
			[...this.entities.values()].flatMap(entity => [
				() => entity.viewUnsub(reason),
				() => entity.observer.close(reason),
			])
		);
	}

	private load({id, type, state}: EntityState) {
		const box = this.entities.get(id);
		if (box) {
			assert(box.entity.type === type, 'load: Crdt type mismatch');
			box.entity.crdt.apply(state as CrdtDiff<any>);

			return box;
		} else {
			const crdt = Crdt.load(state as CrdtDiff<any>);
			const [view, viewUnsub] = deriveCrdtSnapshot(crdt);
			const entity = {
				crdt,
				id,
				type,
			} as Entity;
			const box: EntityBox = {
				entity,
				view,
				viewUnsub,
				observer: this.observe(entity),
			};
			this.entities.set(id, box);
			return box;
		}
	}

	private observe(entity: Entity): {
		sender: DiffSender<any>;
		close: Unsubscribe;
	} {
		const sender = new DiffSender(this.rpc, entity);

		return {
			sender,
			close: entity.crdt.onUpdate(diff => {
				sender.enqueue(diff);
			}),
		};
	}
}
