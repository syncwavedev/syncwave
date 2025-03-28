import {assert, Crdt, type Unsubscribe, type ValueChange} from 'syncwave';
import type {State} from './state';

function applyChange(state: unknown, change: ValueChange) {
	assert(change.path.length > 0, 'change path must not be empty');
	assert(
		typeof state === 'object' && state !== null,
		'change target must be an object'
	);
	const key = change.path[0];
	assert(key in state, 'change path must be a valid property');

	if (change.path.length === 1) {
		(state as Record<string | number, unknown>)[key] = change.value;
	} else {
		applyChange((state as Record<string | number, unknown>)[key], {
			path: change.path.slice(1),
			value: change.value,
		});
	}
}

export function deriveCrdtSnapshot<T>(crdt: Crdt<T>): [State<T>, Unsubscribe] {
	const snapshot = $state({value: crdt.snapshot(true)});

	const unsub = crdt.onChange(changes => {
		changes.forEach(change => {
			applyChange(snapshot, {
				path: ['value', ...change.path],
				value: change.value,
			});
		});
	});

	return [snapshot, unsub];
}
