import {Type, type Static} from '@sinclair/typebox';
import {type UserId} from './data/repos/user-repo.js';
import type {Entry} from './kv/kv-store.js';
import {getNow} from './timestamp.js';
import {assert, equals} from './utils.js';
import {createUuidV4, Uuid} from './uuid.js';

export interface AwarenessUpdate {
    added: number[];
    updated: number[];
    removed: number[];
}

interface AwarenessHandler {
    event: 'update' | 'change';
    handle: (update: AwarenessUpdate, origin: unknown) => void;
}

export function zAwarenessState() {
    return Type.Object({
        user: Type.Optional(
            Type.Object({
                name: Type.String(),
                color: Type.Optional(Type.String()),
            })
        ),
        userId: Type.Optional(Uuid<UserId>()),
        selectedCardId: Type.Optional(Type.String()),
        hoverCardId: Type.Optional(Type.String()),
        __trigger: Type.Optional(Type.String()),
    });
}

export interface AwarenessState
    extends Static<ReturnType<typeof zAwarenessState>> {}

interface MetaAwarenessState {
    lastUpdated: number;
    state: AwarenessState;
}

function toEvent(
    clientId: number,
    prevState: AwarenessState | null,
    nextState: AwarenessState | null
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

    // yjs awareness compatibility
    get clientID() {
        return this.clientId;
    }

    debug() {
        return new Map(
            [...this.states.entries()].map(([key, value]) => [
                key,
                {
                    ts: new Date(value.lastUpdated),
                    state: value.state,
                },
            ])
        );
    }

    constructor(public clientId: number) {
        this.init(clientId);

        this.checkInterval = setInterval(
            this.periodicCheck.bind(this),
            Math.ceil(OUTDATED_TIMEOUT / 10)
        );
    }

    init(clientId: number) {
        this.clientId = clientId;
        this.setLocalState({});
    }

    destroy(): void {
        clearInterval(this.checkInterval);
        this.setLocalState(null);
        this.handlers = [];
    }

    applyRemote(entries: Array<Entry<number, AwarenessState>>) {
        const remoteIds = new Set(entries.map(e => e.key));
        const removed = [...this.states.keys()].filter(
            id => !remoteIds.has(id)
        );

        for (const removedId of removed) {
            this.setState(removedId, null, 'remote');
        }

        for (const {key: clientId, value: state} of entries) {
            this.setState(clientId, state, 'remote');
        }
    }

    setLocalState(state: AwarenessState | null): void {
        this.setState(this.clientId, state, 'local');
    }

    getLocalState(): AwarenessState {
        return this.states.get(this.clientId)?.state ?? {};
    }

    setLocalStateField<K extends keyof AwarenessState>(
        field: K,
        value: AwarenessState[K]
    ): void {
        assert(
            typeof field === 'string',
            'Awareness.setLocalStateField: field must be a string'
        );
        this.setLocalState({
            ...this.getLocalState(),
            [field]: value,
        });
    }

    on(
        event: 'update' | 'change',
        handle: (update: AwarenessUpdate, origin: unknown) => void
    ): void {
        assert(
            event === 'update' || event === 'change',
            'Awareness.on: invalid event type: ' + event
        );

        this.handlers.push({event, handle});
    }

    off(
        event: 'update' | 'change',
        handler: (update: AwarenessUpdate, origin: unknown) => void
    ): void {
        assert(
            event === 'update' || event === 'change',
            'Awareness.off: invalid event type: ' + event
        );

        this.handlers = this.handlers.filter(x => x.handle !== handler);
    }

    getStates(): Map<number, AwarenessState> {
        return new Map(
            [...this.states.entries()].map(([key, value]) => [key, value.state])
        );
    }

    private setState(
        clientId: number,
        state: AwarenessState | null,
        origin: unknown
    ) {
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
            // renew local: force server to send the changed state to all peers
            this.setLocalStateField('__trigger', createUuidV4());
        }

        this.states.forEach((meta, clientId) => {
            if (
                clientId !== this.clientId &&
                OUTDATED_TIMEOUT <= now - meta.lastUpdated &&
                this.states.has(clientId)
            ) {
                console.log('timeout', clientId);
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
