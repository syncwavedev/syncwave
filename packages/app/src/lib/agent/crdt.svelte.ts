import {assert, Crdt, type Unsubscribe, type ValueChange} from 'syncwave';

function applyChange(state: unknown, change: ValueChange) {
    assert(change.path.length > 0, 'change path must not be empty');
    assert(
        typeof state === 'object' && state !== null,
        'change target must be an object'
    );
    const key = change.path[0];
    if (change.path.length === 1) {
        (state as Record<string | number, unknown>)[key] = change.value;
    } else {
        assert(key in state, `key ${key} not found in svelte state`);
        applyChange((state as Record<string | number, unknown>)[key], {
            path: change.path.slice(1),
            value: change.value,
        });
    }
}

export function deriveCrdtSnapshot<T>(crdt: Crdt<T>): [T, Unsubscribe] {
    const snapshot = $state(crdt.snapshot({exposeRichtext: true}));

    const unsub = crdt.onChange(changes => {
        changes.forEach(change => {
            applyChange(snapshot, change);
        });
    });

    return [snapshot, unsub];
}
