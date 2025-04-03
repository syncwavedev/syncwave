import {getContext, onDestroy, setContext} from 'svelte';
import {
    AppError,
    EventEmitter,
    runAll,
    USER_INACTIVITY_TIMEOUT_MS,
    type ActivityMonitor,
    type Unsubscribe,
} from 'syncwave';

const DOCUMENT_ACTIVITY = Symbol('document-activity');

export class DocumentActivityMonitor implements ActivityMonitor {
    private readonly subs: Array<() => void> = [];
    private readonly interval: NodeJS.Timeout;

    documentVisibility: EventEmitter<boolean>;
    active: boolean;

    constructor() {
        this.active = document.visibilityState === 'visible';
        this.documentVisibility = new EventEmitter<boolean>();

        const handleVisibility = (state: 'active' | 'idle') => {
            const currentlyActive = state === 'active';
            if (this.active === currentlyActive) return;

            this.active = currentlyActive;
            this.documentVisibility.emit(currentlyActive);
        };

        this.interval = setInterval(() => {
            if (performance.now() - lastActivity > USER_INACTIVITY_TIMEOUT_MS) {
                handleVisibility('idle');
            }
        }, 1000);

        let lastActivity = performance.now();

        const documentEvents: readonly (keyof DocumentEventMap)[] = [
            'mousemove',
            'mousedown',
            'keydown',
            'scroll',
            'touchstart',
            'pointerdown',
            // this event doesn't mean some activity necessarily, so we use document.visibilityState
            // in the listener
            'visibilitychange',
        ] as const;

        documentEvents.forEach(type => {
            const listener = () => {
                lastActivity = performance.now();
                handleVisibility(
                    document.visibilityState === 'visible' ? 'active' : 'idle'
                );
            };
            document.addEventListener(type, listener, {
                passive: true,
            });
            this.subs.push(() => {
                document.removeEventListener(type, listener);
            });
        });
    }

    subscribe(callback: (active: boolean) => void): Unsubscribe {
        return this.documentVisibility.subscribe(callback);
    }

    destroy() {
        this.documentVisibility.close();
        runAll(this.subs);
        clearInterval(this.interval);
    }
}

export function monitorDocumentActivity() {
    const documentVisibility = new DocumentActivityMonitor();

    onDestroy(() => {
        documentVisibility.destroy();
    });

    setContext(DOCUMENT_ACTIVITY, documentVisibility);
}

export function getDocumentActivity() {
    const result = getContext<DocumentActivityMonitor>(DOCUMENT_ACTIVITY);
    if (!result) {
        throw new AppError("Document visibility monitor isn't setup");
    }
    return result;
}
