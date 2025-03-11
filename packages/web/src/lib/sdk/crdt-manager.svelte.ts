import {
	assert,
	Crdt,
	Uuid,
	type CrdtDiff,
	type Doc,
	type Tuple,
} from 'syncwave-data';
import type {ChangeEvent} from '../../../../data/dist/esm/src/data/data-layer.js';
import {deriveCrdtSnapshot} from './crdt.svelte.js';
import type {State} from './state.js';

export interface CrdtDerivator {
	derive<T extends Doc<Tuple>>(id: Uuid, diff: CrdtDiff<T>): State<T>;
}

export type DocType = 'board' | 'column' | 'card' | 'user';

class CrdtRegistry {
	private readonly registry = new Map<Uuid, Crdt<unknown>>();

	apply(id: Uuid, diff: CrdtDiff<Doc<Tuple>>) {
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
	const registry = new CrdtRegistry();

	return {
		applyEvent(event: ChangeEvent) {
			registry.apply(event.id, event.diff);
		},
		derive<T extends Doc<Tuple>>(id: Uuid, diff: CrdtDiff<T>): State<T> {
			registry.apply(id, diff);
			return deriveCrdtSnapshot(registry.get(id) as Crdt<T>);
		},
	};
}
