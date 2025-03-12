import {
	assert,
	Crdt,
	runAll,
	Uuid,
	type Card,
	type CardId,
	type CoordinatorRpc,
	type CrdtDiff,
	type Doc,
	type Recipe,
	type Tuple,
	type Unsubscribe,
} from 'syncwave-data';
import {deriveCrdtSnapshot} from './crdt.svelte.js';
import type {State} from './state.js';

export interface CrdtDerivator {
	derive<T extends Doc<Tuple>>(id: Uuid, diff: CrdtDiff<T>): State<T>;
}

export type DocType = 'board' | 'column' | 'card' | 'user';

class CrdtRegistry {
	private readonly registry = new Map<Uuid, Crdt<unknown>>();
	private readonly observers = new Map<Uuid, Unsubscribe>();

	constructor(private readonly rpc: CoordinatorRpc) {}

	applyRemoteDiff<T>(id: Uuid, diff: CrdtDiff<T>) {
		const existing = this.registry.get(id);
		if (existing !== undefined) {
			existing.apply(diff);
			return;
		}

		this.registry.set(id, Crdt.load(diff));
	}

	get(id: Uuid) {
		const result = this.registry.get(id);
		assert(result !== undefined, 'Crdt not found');

		if (!this.observers.has(id)) {
			this.observe(id, result);
		}

		return result;
	}

	private observe(id: Uuid, crdt: Crdt<unknown>) {
		if (this.observers.has(id)) return;

		const unsub = crdt.onUpdate(diff => {
			this.rpc.applyCardDiff({
				cardId: id as CardId,
				diff: diff as CrdtDiff<Card>,
			});
		});

		this.observers.set(id, unsub);
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

	applyRemoteEvent<T>(id: Uuid, diff: CrdtDiff<T>) {
		this.registry.applyRemoteDiff(id, diff);
	}
	derive<T extends Doc<Tuple>>(id: Uuid, diff: CrdtDiff<T>): State<T> {
		this.registry.applyRemoteDiff(id, diff);
		const [snapshot, unsub] = deriveCrdtSnapshot(
			this.registry.get(id) as Crdt<T>
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
