import {getNow} from './timestamp.js';
import {assert, equals} from './utils.js';

interface AwarenessUpdate {
    added: number[];
    updated: number[];
    removed: number[];
}

interface AwarenessHandler {
    event: 'update' | 'change';
    handle: (update: AwarenessUpdate, origin: unknown) => void;
}

export type AwarenessState = Record<string, unknown> | null;

interface MetaAwarenessState {
    lastUpdated: number;
    state: AwarenessState;
}

function toEvent(
    clientId: number,
    prevState: AwarenessState,
    nextState: AwarenessState
) {
    const added: number[] = [];
    const updated: number[] = [];
    const changed: number[] = [];
    const removed: number[] = [];
    if (nextState === null) {
        removed.push(clientId);
    } else if (prevState === null) {
        if (nextState !== null) {
            added.push(clientId);
        }
    } else {
        updated.push(clientId);
        if (!equals(prevState, nextState)) {
            changed.push(clientId);
        }
    }

    return {
        change:
            added.length > 0 || changed.length > 0 || removed.length > 0
                ? {added, updated: changed, removed}
                : undefined,
        update: {added, updated, removed},
    };
}

export const OUTDATED_TIMEOUT = 30000;

export class Awareness {
    private handlers: AwarenessHandler[] = [];
    private readonly states = new Map<number, MetaAwarenessState>();
    private readonly checkInterval: NodeJS.Timeout;

    constructor(public readonly clientId: number) {
        this.states.set(clientId, {lastUpdated: getNow(), state: {}});

        this.checkInterval = setInterval(
            () => this.periodicCheck.bind(this),
            Math.ceil(OUTDATED_TIMEOUT / 10)
        );
    }

    destroy(): void {
        clearInterval(this.checkInterval);
        this.setLocalState(null);
        this.handlers = [];
    }

    applyRemote(clientId: number, state: AwarenessState, origin: unknown) {
        assert(
            clientId !== this.clientId,
            'Awareness.apply: clientId must not be equal to local clientId'
        );

        this.setState(clientId, state, origin);
    }

    setLocalState(state: AwarenessState): void {
        this.setState(this.clientId, state, 'local');
    }

    getLocalState(): AwarenessState {
        return this.states.get(this.clientId)?.state ?? null;
    }

    setLocalStateField(field: string, value: unknown): void {
        assert(
            typeof field === 'string',
            'Awareness.setLocalStateField: field must be a string'
        );
        this.states.set(this.clientId, {
            lastUpdated: getNow(),
            state: {
                ...this.getLocalState(),
                [field]: value,
            },
        });
    }

    on(
        event: 'update' | 'change',
        handle: (update: AwarenessUpdate) => void
    ): void {
        assert(
            event === 'update' || event === 'change',
            'Awareness.on: invalid event type: ' + event
        );

        this.handlers.push({event, handle});
    }

    off(event: 'update' | 'change', handler: AwarenessHandler): void {
        assert(
            event === 'update' || event === 'change',
            'Awareness.off: invalid event type: ' + event
        );

        this.handlers = this.handlers.filter(h => h !== handler);
    }

    getStates() {
        return this.states;
    }

    private setState(clientId: number, state: AwarenessState, origin: unknown) {
        const prevState = this.states.get(clientId)?.state ?? null;
        if (state === null) {
            this.states.delete(clientId);
        } else {
            this.states.set(clientId, {lastUpdated: getNow(), state});
        }

        const {change, update} = toEvent(clientId, prevState, state);
        if (change) {
            this.emit('change', change, origin);
        }
        this.emit('update', update, origin);
    }

    private periodicCheck() {
        const now = getNow();
        const local = this.states.get(this.clientId);
        assert(local !== undefined, 'Awareness.check: local state not found');
        if (
            local.state !== null &&
            now - local.lastUpdated >= OUTDATED_TIMEOUT / 2
        ) {
            // renew local
            this.setLocalState(this.getLocalState());
        }

        this.states.forEach((meta, clientId) => {
            if (
                clientId !== this.clientId &&
                OUTDATED_TIMEOUT <= now - meta.lastUpdated &&
                this.states.has(clientId)
            ) {
                this.setState(clientId, null, 'timeout');
            }
        });
    }

    private emit(
        event: 'update' | 'change',
        update: AwarenessUpdate,
        origin: unknown = this
    ): void {
        assert(
            event === 'update' || event === 'change',
            'Awareness.emit: invalid event type: ' + event
        );

        for (const handler of this.handlers) {
            if (handler.event === event) {
                handler.handle(update, origin);
            }
        }
    }
}
