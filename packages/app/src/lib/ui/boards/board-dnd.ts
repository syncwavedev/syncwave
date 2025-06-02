import {getContext, onDestroy, setContext} from 'svelte';
import {
    clip,
    compareNumbers,
    createUuidV4,
    EventEmitter,
    log,
    runAll,
    toPosition,
    type CardId,
    type ColumnId,
} from 'syncwave';
import type {Agent} from '../../agent/agent.svelte.js';
import type {CardTreeView, ColumnView} from '../../agent/view.svelte.js';

export const DND_REORDER_DURATION_MS = 500;
export const DND_DROP_DURATION_MS = 150;
export const DND_CARD_GAP = 8;

type Cleanup = () => void;

export interface Ref<T> {
    value: T;
}

interface CleanupContext {
    cleanups: Cleanup[];
}

export interface DndCardContext extends CleanupContext {
    card: Ref<CardTreeView>;
    container: HTMLDivElement;
}

export interface DndColumnContext extends CleanupContext {
    column: Ref<ColumnView>;
    container: HTMLDivElement;
    scrollable: HTMLDivElement;
}

interface Draggable {
    element: HTMLElement;
    targetX: number;
    targetY: number;
    targetColumnId: ColumnId;
}

export class DndBoardContext {
    container!: HTMLDivElement;
    scrollable!: HTMLDivElement;
    private columns: DndColumnContext[] = [];
    private cards: DndCardContext[] = [];
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
                    log.debug({
                        msg: '[board-dnd] cancelDragEmitter.emit',
                        eventName,
                    });
                    this.cancelDragEmitter.emit({pointerId: e.pointerId});
                }
            );
            this.cleanups.push(cancelListener);
        });
    }

    registerBoard(container: HTMLDivElement, scrollable: HTMLDivElement) {
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

    registerCard(card: DndCardContext): Cleanup {
        this.cards.push(card);

        this.addListener(card, card.container, 'pointerdown', downEvent => {
            log.debug({
                msg: '[board-dnd] pointerdown',
                eventName: 'pointerdown',
                pointerId: downEvent.pointerId,
            });
            const cleanupDown = () => {
                log.debug({msg: '[board-dnd] cleanupDown'});
                cancelPointerMoveListener();
                cancelDragSub('registerCard pointerdown cleanup');
            };

            const cancelDragSub = this.cancelDragEmitter.subscribe(e => {
                log.debug({msg: '[board-dnd] cancelDragEmitter', e});
                if (
                    e.pointerId !== undefined ||
                    e.pointerId === downEvent.pointerId
                ) {
                    log.debug({
                        msg: '[board-dnd] cancelDragEmitter cleanup',
                        eventName: 'cancelDragEmitter',
                        pointerId: e.pointerId,
                    });
                    cleanupDown();
                }
            });

            const cancelPointerMoveListener = this.addListener(
                card,
                this.container,
                'pointermove',
                moveEvent => {
                    log.debug({
                        msg: '[board-dnd] pointermove',
                        eventName: 'pointermove',
                        movePointerId: moveEvent.pointerId,
                        downPointerId: downEvent.pointerId,
                    });
                    if (downEvent.pointerId !== moveEvent.pointerId) return;

                    const distance = Math.sqrt(
                        Math.pow(downEvent.pageX - moveEvent.pageX, 2) +
                            Math.pow(downEvent.pageY - moveEvent.pageY, 2)
                    );
                    log.debug({
                        msg: '[board-dnd] pointermove distance: ' + distance,
                    });
                    if (distance < 10) return;

                    cleanupDown();
                    this.startDrag(moveEvent, card);
                }
            );
        });

        return () => {
            this.cards = this.cards.filter(x => x !== card);
            runAll(card?.cleanups ?? []);
        };
    }

    registerColumn(column: DndColumnContext) {
        this.columns.push(column);
        const scrollListener = () => this.scrollEmitter.emit();
        this.addListener(column, column.scrollable, 'scroll', scrollListener, {
            passive: true,
        });

        return () => {
            this.columns = this.columns.filter(x => x !== column);
            runAll(column.cleanups ?? []);
        };
    }

    destroy() {
        runAll(
            this.cleanups
                .concat(this.cards.flatMap(x => x.cleanups))
                .concat(this.columns.flatMap(x => x.cleanups))
                .concat([() => this.scrollEmitter.close()])
        );

        this.cards = [];
        this.columns = [];
        this.cleanups = [];
    }

    private startDrag(downEvent: PointerEvent, card: DndCardContext) {
        const dragId = createUuidV4();
        log.debug({
            msg: '[board-dnd] startDrag',
            dragId,
            cardId: card.card.value.id,
        });

        const draggable: Draggable = {
            element: card.container.cloneNode(true) as HTMLDivElement,
            targetX: card.container.getBoundingClientRect().left,
            targetY: card.container.getBoundingClientRect().top,
            targetColumnId: card.card.value.columnId,
        };
        document.body.appendChild(draggable.element);

        this.agent.considerCardPosition(
            card.card.value.id,
            card.card.value.columnId,
            card.card.value.position
        );

        draggable.element.style.position = 'absolute';
        draggable.element.style.pointerEvents = 'none';
        draggable.element.style.zIndex = '1000';
        draggable.element.style.userSelect = 'none';
        draggable.element.style.width = `${card.container.clientWidth}px`;
        draggable.element.style.height = `${card.container.clientHeight}px`;

        const startDraggableX = card.container.getBoundingClientRect().left;
        const startDraggableY = card.container.getBoundingClientRect().top;

        draggable.element.style.left = `${startDraggableX}px`;
        draggable.element.style.top = `${startDraggableY}px`;

        const startPointerX = downEvent.pageX;
        const startPointerY = downEvent.pageY;

        const cancelPointerMove = this.addListener(
            this,
            document,
            'pointermove',
            moveEvent => {
                log.debug({
                    msg: '[board-dnd] pointermove',
                    eventName: 'pointermove',
                    dragId,
                    movePointerId: moveEvent.pointerId,
                    downPointerId: downEvent.pointerId,
                });

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

                this.handlePlacement(draggable, card.card.value.id);
            }
        );

        const cancelScrollListener = this.scrollEmitter.subscribe(() => {
            this.handlePlacement(draggable, card.card.value.id);
        });

        const cancelAutoscroll = this.monitorAutoscroll(draggable);

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) {
                log.debug({msg: '[board-dnd] cleanup already called', dragId});
                return;
            }
            cleanedUp = true;

            log.debug({msg: `cleanup`, dragId});

            this.handleDrop(card.card.value.id, draggable, dragId);

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
        const AUTOSCROLL_THRESHOLD_X = 20;
        const AUTOSCROLL_THRESHOLD_Y = 100;

        const scroller = new Scroller(this.scrollable);

        const cancelPointerMoveListener = this.addListener(
            this,
            document,
            'pointermove',
            () => {
                const draggableRect = draggable.element.getBoundingClientRect();
                const draggableCenterX =
                    draggableRect.left + draggable.element.clientWidth / 2;

                scroller.direction = 'none';

                const boardRect = this.scrollable.getBoundingClientRect();
                if (
                    this.scrollable.scrollLeft > 0 &&
                    draggableRect.left < boardRect.left + AUTOSCROLL_THRESHOLD_X
                ) {
                    scroller.direction = 'left';
                    scroller.target = this.scrollable;
                } else if (
                    this.scrollable.scrollLeft <
                        this.scrollable.clientWidth +
                            this.scrollable.scrollWidth &&
                    draggableRect.right >
                        boardRect.right - AUTOSCROLL_THRESHOLD_X
                ) {
                    scroller.direction = 'right';
                    scroller.target = this.scrollable;
                } else {
                    const column = this.columns.find(column => {
                        const rect = column.scrollable.getBoundingClientRect();
                        return (
                            draggableCenterX >= rect.left &&
                            draggableCenterX <= rect.right
                        );
                    });

                    if (!column) {
                        return;
                    }

                    const draggableCenterY =
                        draggableRect.top + draggable.element.clientHeight / 2;

                    if (
                        draggableCenterY <
                        column.scrollable.getBoundingClientRect().top +
                            AUTOSCROLL_THRESHOLD_Y
                    ) {
                        scroller.direction = 'up';
                        scroller.target = column.scrollable;
                    } else if (
                        draggableCenterY >
                        column.scrollable.getBoundingClientRect().bottom -
                            AUTOSCROLL_THRESHOLD_Y
                    ) {
                        scroller.direction = 'down';
                        scroller.target = column.scrollable;
                    }
                }
            }
        );

        const cleanup = () => {
            cancelPointerMoveListener();
            scroller.destroy();
        };

        return cleanup;
    }

    private handleDrop(cardId: CardId, draggable: Draggable, dragId: string) {
        log.debug({
            msg: '[board-dnd] handleDrop',
            dragId,
        });
        const card = this.cards.find(x => x.card.value.id === cardId);

        if (!card || !card.container.isConnected) {
            log.warn({msg: `card ${cardId} not found for DnD drop`});
            if (draggable.element.isConnected) {
                log.debug({
                    msg: `removing dnd draggable element from DOM`,
                    dragId,
                });
                document.body.removeChild(draggable.element);
            } else {
                log.debug({
                    msg: `dnd draggable element already removed from DOM`,
                    dragId,
                });
            }

            this.agent.finalizeCardPosition(cardId);

            return;
        }

        log.debug({
            msg: `dnd drop: card ${cardId} found`,
            dragId,
        });

        setTimeout(() => {
            if (draggable.element.isConnected) {
                log.debug({
                    msg: `dnd drop timeout: removing dnd draggable element from DOM`,
                    dragId,
                });
                document.body.removeChild(draggable.element);
            } else {
                log.debug({
                    msg: `dnd drop timeout: dnd draggable element already removed from DOM`,
                    dragId,
                });
            }

            this.agent.finalizeCardPosition(cardId);
        }, DND_DROP_DURATION_MS);

        // find final placement
        this.handlePlacement(draggable, cardId);

        const transition = `transform ${DND_DROP_DURATION_MS}ms ease`;
        draggable.element.style.transition = draggable.element.style.transition
            ? draggable.element.style.transition + ',' + transition
            : transition;

        const draggableRect = draggable.element.getBoundingClientRect();
        const animateToX = draggable.targetX - draggableRect.x;
        const animateToY = draggable.targetY - draggableRect.y;

        draggable.element.style.transform = `translate(${animateToX}px, ${animateToY}px)`;
    }

    private getClosestColumn(draggable: Draggable) {
        const draggableRect = draggable.element.getBoundingClientRect();
        const boardRect = this.scrollable.getBoundingClientRect();
        const draggableCenterX = clip({
            value: draggableRect.left + draggable.element.clientWidth / 2,
            min: boardRect.x,
            max: boardRect.x + boardRect.width,
        });

        return this.columns
            .filter(x => x.container.isConnected)
            .map(column => {
                const rect = column.scrollable.getBoundingClientRect();
                return {
                    column,
                    distance: Math.abs(
                        rect.x + rect.width / 2 - draggableCenterX
                    ),
                };
            })
            .sort((a, b) => a.distance - b.distance)
            .at(0)?.column;
    }

    private handlePlacement(draggable: Draggable, cardId: CardId) {
        const targetColumn = this.getClosestColumn(draggable);
        if (!targetColumn) {
            log.error({msg: 'No target column for DnD found'});
            return;
        }

        const card = this.cards.find(x => x.card.value.id === cardId);
        if (!card) {
            log.error({msg: 'No card for DnD found'});
            return;
        }

        const draggableRect = draggable.element.getBoundingClientRect();
        const draggableCenterY =
            draggableRect.top + draggable.element.clientHeight / 2;
        const cardHeight = card.container.clientHeight;

        const columnCards = this.cards
            .filter(
                x =>
                    x.card.value.columnId === targetColumn.column.value.id &&
                    x.container.isConnected
            )
            .sort((a, b) =>
                compareNumbers(a.card.value.position, b.card.value.position)
            );

        const oldIndexInTargetColumn = columnCards.findIndex(
            x => x.card.value.id === card.card.value.id
        );

        let oldPrev: DndCardContext | undefined = undefined;
        let oldNext: DndCardContext | undefined = undefined;
        if (oldIndexInTargetColumn !== -1) {
            oldPrev = columnCards[oldIndexInTargetColumn - 1];
            oldNext = columnCards[oldIndexInTargetColumn + 1];
        }

        let prev: DndCardContext | undefined = undefined;
        let next: DndCardContext | undefined = undefined;

        let offsetTop = targetColumn.container.getBoundingClientRect().top;
        for (const neighbor of columnCards) {
            const neighborRectNative =
                neighbor.container.getBoundingClientRect();
            const combinedHeight =
                neighborRectNative.height + DND_CARD_GAP + cardHeight;
            const combinedTop = offsetTop;
            const combinedCenterY = combinedTop + combinedHeight / 2;

            if (draggableCenterY <= combinedCenterY) {
                next = neighbor;

                break;
            }

            prev = neighbor;
            if (neighbor.card.value.id !== card.card.value.id) {
                offsetTop += DND_CARD_GAP + neighborRectNative.height;
            }
        }

        draggable.targetX = targetColumn.container.getBoundingClientRect().left;
        draggable.targetY = offsetTop;

        const columnChanged = oldIndexInTargetColumn === -1;
        const selfPrevAnchor = prev?.card.value.id === card.card.value.id;
        const selfNextAnchor = next?.card.value.id === card.card.value.id;
        const prevChanged = oldPrev?.card.value.id !== prev?.card.value.id;
        const nextChanged = oldNext?.card.value.id !== next?.card.value.id;

        if (
            (columnChanged || prevChanged || nextChanged) &&
            !selfPrevAnchor &&
            !selfNextAnchor
        ) {
            const newCardPosition = toPosition({
                prev: prev?.card.value.position,
                next: next?.card.value.position,
            });
            this.agent.considerCardPosition(
                card.card.value.id,
                targetColumn.column.value.id,
                newCardPosition
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

const DND_CONTEXT = Symbol('DndContext');

export function createDndContext(agent: Agent): DndBoardContext {
    const existingContext = getContext(DND_CONTEXT);
    if (existingContext) {
        throw new Error('DndContext already exists');
    }

    const context = new DndBoardContext(agent);
    setContext(DND_CONTEXT, context);

    onDestroy(() => {
        context.destroy();
    });

    return context;
}

export function getDndBoardContext(): DndBoardContext {
    const context = getContext(DND_CONTEXT);
    if (!context) {
        throw new Error('DndContext not found');
    }
    return context as DndBoardContext;
}

class Scroller {
    private isCancelled = false;
    public direction: 'left' | 'right' | 'up' | 'down' | 'none' = 'none';
    private lastTick = performance.now() - 1000 / 60;

    constructor(public target: HTMLElement) {
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

        // 2025-03-25: we con't use scrollBy, because Safari will report incorrect DOMRect.top for cards inside the scrollable
        this.target.scrollTo({
            left: dx * adjustment + this.target.scrollLeft,
            top: dy * adjustment + this.target.scrollTop,
        });
    }

    destroy() {
        this.isCancelled = true;
    }
}
