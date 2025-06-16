import {getContext, onDestroy, setContext} from 'svelte';
import {
    clip,
    compareNumbers,
    EventEmitter,
    log,
    runAll,
    toPosition,
    type ColumnId,
} from 'syncwave';
import type {Agent} from '../../agent/agent.svelte.js';
import type {ColumnView} from '../../agent/view.svelte.js';

export const DND_REORDER_DURATION_MS = 500;
export const DND_DROP_DURATION_MS = 150;
export const DND_COLUMN_GAP = 1;

type Cleanup = () => void;

export interface Ref<T> {
    value: T;
}

interface CleanupContext {
    cleanups: Cleanup[];
}

export interface DndColumnContext extends CleanupContext {
    column: Ref<ColumnView>;
    container: HTMLDivElement;
    handle: HTMLElement;
}

interface Draggable {
    element: HTMLElement;
    targetX: number;
    targetY: number;
}

export class DndColumnListContext {
    container!: HTMLDivElement;
    scrollable!: HTMLDivElement;
    private columns: DndColumnContext[] = [];
    public cleanups: Cleanup[] = [];

    private scrollEmitter = new EventEmitter<void>();
    private cancelDragEmitter = new EventEmitter<{pointerId?: number}>();

    constructor(private readonly agent: Agent) {
        // global listeners to cover potential interruptions
        const globalEvents = [
            'contextmenu',
            'blur',
            'visibilitychange',
            'pointerleave',
            'pointerup',
            'pointercancel',
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalEvents.forEach((eventName: any) => {
            const cancelListener = this.addListener(
                this,
                document,
                eventName,
                e => {
                    this.cancelDragEmitter.emit({pointerId: e.pointerId});
                }
            );
            this.cleanups.push(cancelListener);
        });
    }

    registerColumnList(container: HTMLDivElement, scrollable: HTMLDivElement) {
        this.container = container;
        this.scrollable = scrollable;

        const scrollListener = () => this.scrollEmitter.emit();
        this.addListener(this, this.scrollable, 'scroll', scrollListener, {
            passive: true,
        });

        return () => {
            this.destroy();
        };
    }

    registerColumn(column: DndColumnContext): Cleanup {
        this.columns.push(column);

        this.addListener(column, column.handle, 'pointerdown', downEvent => {
            const cleanupDown = () => {
                cancelPointerMoveListener();
                cancelDragSub('registerCard pointerdown cleanup');
            };

            const cancelDragSub = this.cancelDragEmitter.subscribe(e => {
                if (
                    e.pointerId !== undefined ||
                    e.pointerId === downEvent.pointerId
                ) {
                    cleanupDown();
                }
            });

            const cancelPointerMoveListener = this.addListener(
                column,
                this.container,
                'pointermove',
                moveEvent => {
                    if (downEvent.pointerId !== moveEvent.pointerId) return;

                    const distance = Math.sqrt(
                        Math.pow(downEvent.pageX - moveEvent.pageX, 2) +
                            Math.pow(downEvent.pageY - moveEvent.pageY, 2)
                    );
                    if (distance < 10) return;

                    cleanupDown();
                    this.startDrag(moveEvent, column);
                }
            );
        });

        return () => {
            this.columns = this.columns.filter(x => x !== column);
            runAll(column?.cleanups ?? []);
        };
    }

    destroy() {
        runAll(
            this.cleanups
                .concat(this.columns.flatMap(x => x.cleanups))
                .concat([() => this.scrollEmitter.close()])
        );

        this.columns = [];
        this.cleanups = [];
    }

    private startDrag(downEvent: PointerEvent, column: DndColumnContext) {
        const draggable: Draggable = {
            element: column.container.cloneNode(true) as HTMLDivElement,
            targetX: column.container.getBoundingClientRect().left,
            targetY: column.container.getBoundingClientRect().top,
        };
        document.body.appendChild(draggable.element);

        this.agent.considerColumnPosition(
            column.column.value.id,
            column.column.value.position
        );

        draggable.element.style.position = 'absolute';
        draggable.element.style.pointerEvents = 'none';
        draggable.element.style.zIndex = '1000';
        draggable.element.style.userSelect = 'none';
        draggable.element.style.width = `${column.container.clientWidth}px`;
        draggable.element.style.height = `${column.container.clientHeight}px`;

        const startDraggableX = column.container.getBoundingClientRect().left;
        const startDraggableY = column.container.getBoundingClientRect().top;

        draggable.element.style.left = `${startDraggableX}px`;
        draggable.element.style.top = `${startDraggableY}px`;

        const startPointerX = downEvent.pageX;
        const startPointerY = downEvent.pageY;

        const cancelPointerMove = this.addListener(
            this,
            document,
            'pointermove',
            moveEvent => {
                const deltaX = moveEvent.pageX - startPointerX;
                const deltaY = moveEvent.pageY - startPointerY;

                const gap = 1;
                const nextX = clip({
                    value: startDraggableX + deltaX,
                    min: gap,
                    max:
                        window.innerWidth - draggable.element.clientWidth - gap,
                });
                const nextY = clip({
                    value: startDraggableY + deltaY,
                    min: gap,
                    max:
                        window.innerHeight -
                        draggable.element.clientHeight -
                        gap,
                });

                draggable.element.style.left = `${nextX}px`;
                draggable.element.style.top = `${nextY}px`;

                this.handlePlacement(draggable, column.column.value.id);
            }
        );

        const cancelScrollListener = this.scrollEmitter.subscribe(() => {
            this.handlePlacement(draggable, column.column.value.id);
        });

        const cancelAutoscroll = this.monitorAutoscroll(draggable);

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) {
                return;
            }
            cleanedUp = true;

            this.handleDrop(column.column.value.id, draggable);

            cancelAutoscroll();
            cancelPointerUp();
            cancelPointerMove();
            cancelScrollListener('startDrag cleanup');
            cancelPointerCancel();
            cancelDragSub('startDrag cleanup');
        };

        const cancelDragSub = this.cancelDragEmitter.subscribe(() => {
            cleanup();
        });

        const cancelPointerUp = this.addListener(
            this,
            document,
            'pointerup',
            cleanup
        );
        const cancelPointerCancel = this.addListener(
            this,
            document,
            'pointercancel',
            cleanup
        );
    }

    private monitorAutoscroll(draggable: Draggable) {
        const AUTOSCROLL_THRESHOLD_Y = 100;

        const scroller = new Scroller(this.scrollable);

        const cancelPointerMoveListener = this.addListener(
            this,
            document,
            'pointermove',
            () => {
                const draggableRect = draggable.element.getBoundingClientRect();

                const draggableCenterY =
                    draggableRect.top + draggable.element.clientHeight / 2;
                if (
                    draggableCenterY <
                    this.scrollable.getBoundingClientRect().top +
                        AUTOSCROLL_THRESHOLD_Y
                ) {
                    scroller.direction = 'up';
                } else if (
                    draggableCenterY >
                    this.scrollable.getBoundingClientRect().bottom -
                        AUTOSCROLL_THRESHOLD_Y
                ) {
                    scroller.direction = 'down';
                } else {
                    scroller.direction = 'none';
                }
            }
        );

        const cleanup = () => {
            cancelPointerMoveListener();
            scroller.destroy();
        };

        return cleanup;
    }

    private handleDrop(columnId: ColumnId, draggable: Draggable) {
        const column = this.columns.find(x => x.column.value.id === columnId);

        if (!column || !column.container.isConnected) {
            log.warn({msg: `card ${columnId} not found for DnD drop`});
            if (draggable.element.isConnected) {
                document.body.removeChild(draggable.element);
            }

            this.agent.finalizeColumnPosition(columnId);

            return;
        }

        setTimeout(() => {
            if (draggable.element.isConnected) {
                document.body.removeChild(draggable.element);
            }

            this.agent.finalizeColumnPosition(columnId);
        }, DND_DROP_DURATION_MS);

        // find final placement
        this.handlePlacement(draggable, columnId);

        const transition = `transform ${DND_DROP_DURATION_MS}ms ease`;
        draggable.element.style.transition = draggable.element.style.transition
            ? draggable.element.style.transition + ',' + transition
            : transition;

        const draggableRect = draggable.element.getBoundingClientRect();
        const animateToX = draggable.targetX - draggableRect.x;
        const animateToY = draggable.targetY - draggableRect.y;

        draggable.element.style.transform = `translate(${animateToX}px, ${animateToY}px)`;
    }

    private handlePlacement(draggable: Draggable, columnId: ColumnId) {
        const column = this.columns.find(x => x.column.value.id === columnId);
        if (!column) {
            log.error({msg: 'No column for DnD found'});
            return;
        }

        const draggableRect = draggable.element.getBoundingClientRect();
        const draggableCenterY =
            draggableRect.top + draggable.element.clientHeight / 2;
        const columnHeight = column.container.clientHeight;

        const columns = this.columns.sort((a, b) =>
            compareNumbers(a.column.value.position, b.column.value.position)
        );

        const oldIndex = columns.findIndex(
            x => x.column.value.id === column.column.value.id
        );

        let oldPrev: DndColumnContext | undefined = undefined;
        let oldNext: DndColumnContext | undefined = undefined;
        if (oldIndex !== -1) {
            oldPrev = columns[oldIndex - 1];
            oldNext = columns[oldIndex + 1];
        }

        let prev: DndColumnContext | undefined = undefined;
        let next: DndColumnContext | undefined = undefined;

        let offsetTop = this.container.getBoundingClientRect().top;
        for (const neighbor of columns) {
            const neighborRectNative =
                neighbor.container.getBoundingClientRect();
            const combinedHeight =
                neighborRectNative.height + DND_COLUMN_GAP + columnHeight;
            const combinedTop = offsetTop;
            const combinedCenterY = combinedTop + combinedHeight / 2;

            if (draggableCenterY <= combinedCenterY) {
                next = neighbor;

                break;
            }

            prev = neighbor;
            if (neighbor.column.value.id !== column.column.value.id) {
                offsetTop += DND_COLUMN_GAP + neighborRectNative.height;
            }
        }

        draggable.targetX = this.container.getBoundingClientRect().left;
        draggable.targetY = offsetTop;

        const columnChanged = oldIndex === -1;
        const selfPrevAnchor = prev?.column.value.id === column.column.value.id;
        const selfNextAnchor = next?.column.value.id === column.column.value.id;
        const prevChanged = oldPrev?.column.value.id !== prev?.column.value.id;
        const nextChanged = oldNext?.column.value.id !== next?.column.value.id;

        if (
            (columnChanged || prevChanged || nextChanged) &&
            !selfPrevAnchor &&
            !selfNextAnchor
        ) {
            const newColumnPosition = toPosition({
                prev: prev?.column.value.position,
                next: next?.column.value.position,
            });
            this.agent.considerColumnPosition(
                column.column.value.id,
                newColumnPosition
            );
        }
    }

    private addListener<
        K extends keyof HTMLElementEventMap & keyof DocumentEventMap,
    >(
        cleanupContext: CleanupContext,
        element: HTMLElement | Document,
        event: K,
        handler: (event: HTMLElementEventMap[K], cleanup: Cleanup) => void,
        options?: {passive?: boolean; capture?: boolean}
    ) {
        const cleanup = () => {
            element.removeEventListener(event, wrapper, options);
            cleanupContext.cleanups = cleanupContext.cleanups.filter(
                x => x !== wrapper
            );
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrapper = (e: any) => {
            handler(e, cleanup);
        };

        cleanupContext.cleanups.push(cleanup);

        element.addEventListener(event, wrapper, options);

        return cleanup;
    }
}

const DND_COLUMN_LIST_CONTEXT = Symbol('DndColumnListContext');

export function createDndColumnListContext(agent: Agent): DndColumnListContext {
    const existingContext = getContext(DND_COLUMN_LIST_CONTEXT);
    if (existingContext) {
        throw new Error('DndColumnListContext already exists');
    }

    const context = new DndColumnListContext(agent);
    setContext(DND_COLUMN_LIST_CONTEXT, context);

    onDestroy(() => {
        context.destroy();
    });

    return context;
}

export function getDndColumnListContext(): DndColumnListContext {
    const context = getContext(DND_COLUMN_LIST_CONTEXT);
    if (!context) {
        throw new Error('DndColumnListContext not found');
    }
    return context as DndColumnListContext;
}

class Scroller {
    private isCancelled = false;
    public direction: 'left' | 'right' | 'up' | 'down' | 'none' = 'none';
    private lastTick = performance.now() - 1000 / 60;

    constructor(private readonly target: HTMLElement) {
        const animation = () => {
            if (this.isCancelled) return;
            this.tick();
            requestAnimationFrame(() => animation());
        };
        animation();
    }

    tick() {
        const now = performance.now();
        const elapsedSeconds = (now - this.lastTick) / 1000;
        this.lastTick = now;

        let dx = 0;
        let dy = 0;

        if (this.direction === 'none') {
            // do nothing
        } else if (this.direction === 'up') {
            dy = -1;
        } else if (this.direction === 'down') {
            dy = 1;
        } else if (this.direction === 'left') {
            dx = -1;
        } else if (this.direction === 'right') {
            dx = 1;
        }

        if (dx === 0 && dy === 0) return;

        // px / second
        const SPEED = 500;
        const adjustment = SPEED * elapsedSeconds;

        // 2025-03-25: we con't use scrollBy, because Safari will report incorrect DOMRect.top for columns inside the scrollable
        this.target.scrollTo({
            left: dx * adjustment + this.target.scrollLeft,
            top: dy * adjustment + this.target.scrollTop,
        });
    }

    destroy() {
        this.isCancelled = true;
    }
}
