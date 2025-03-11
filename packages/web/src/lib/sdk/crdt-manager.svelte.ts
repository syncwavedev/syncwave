import {
	assert,
	Crdt,
	Uuid,
	type CrdtDiff,
	type Doc,
	type Recipe,
	type Tuple,
} from 'syncwave-data';
import {deriveCrdtSnapshot} from './crdt.svelte.js';
import type {State} from './state.js';

export interface CrdtDerivator {
	derive<T extends Doc<Tuple>>(id: Uuid, diff: CrdtDiff<T>): State<T>;
}

export type DocType = 'board' | 'column' | 'card' | 'user';

class CrdtRegistry {
	private readonly registry = new Map<Uuid, Crdt<unknown>>();

	apply<T>(id: Uuid, diff: CrdtDiff<T>) {
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
		return result;
	}
}

export function createCrdtManager() {
	// todo: fix leaks
	const registry = new CrdtRegistry();

	return {
		applyEvent<T>(id: Uuid, diff: CrdtDiff<T>) {
			registry.apply(id, diff);
		},
		derive<T extends Doc<Tuple>>(id: Uuid, diff: CrdtDiff<T>): State<T> {
			registry.apply(id, diff);
			return deriveCrdtSnapshot(registry.get(id) as Crdt<T>);
		},
		update<T>(id: Uuid, recipe: Recipe<T>) {
			const crdt = registry.get(id) as Crdt<T>;
			const diff = crdt.update(recipe);
			if (diff) {
				this.applyEvent(id, diff);
			}

			return diff;
		},
	};
}
