import {
	assert,
	Crdt,
	stringifyCrdtDiff,
	type CrdtDiffBase64,
	type Recipe,
} from 'syncwave-data';

export class SetCrdt<
	T extends {id: string; state: CrdtDiffBase64<Omit<T, 'state'>>},
> {
	private items: Array<Crdt<Omit<T, 'state'>>>;

	constructor(items: T[]) {
		this.items = items.map(item => Crdt.load(item.state));
	}

	snapshot() {
		return new Set(
			this.items.map(x => ({
				...x.snapshot(),
				state: stringifyCrdtDiff(x.state()),
			}))
		);
	}

	update(id: T['id'], recipe: Recipe<Omit<T, 'state'>>) {
		const item = this.items.find(x => x.snapshot().id === id);
		assert(item !== undefined, 'SetCrdt: item not found');

		return item.update(recipe);
	}

	apply(remote: Set<T>) {
		// remove
		this.items = this.items.filter(local =>
			[...remote.values()].some(
				remote => remote.id === local.snapshot().id
			)
		);

		for (const item of remote) {
			const local = this.items.find(x => x.snapshot().id === item.id);

			if (local) {
				// update
				local.apply(item.state);
			} else {
				// add
				this.items.push(Crdt.load(item.state));
			}
		}
	}
}
