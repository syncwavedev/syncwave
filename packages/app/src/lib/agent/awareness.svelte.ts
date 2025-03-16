import {SvelteMap} from 'svelte/reactivity';
import type {Awareness, AwarenessState, AwarenessUpdate} from 'syncwave-data';

export function observeAwareness(awareness: Awareness) {
	const result = new SvelteMap<number, AwarenessState>();

	$effect(() => {
		const handler = ({added, removed, updated}: AwarenessUpdate) => {
			const states = awareness.getStates();
			for (const clientId of added.concat(updated)) {
				const state = states.get(clientId);
				if (state) {
					result.set(clientId, state);
				} else {
					result.delete(clientId);
				}
			}

			removed.forEach(clientId => result.delete(clientId));
		};

		awareness.on('change', handler);

		return () => awareness.off('change', handler);
	});

	return result;
}
