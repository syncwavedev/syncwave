import {SvelteMap} from 'svelte/reactivity';
import {
    context,
    type Awareness,
    type AwarenessState,
    type AwarenessUpdate,
} from 'syncwave';

export function observeAwareness(awareness: Awareness) {
    const result = new SvelteMap<number, AwarenessState>();

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

    context().onEnd(() => awareness.off('change', handler));

    return result;
}
