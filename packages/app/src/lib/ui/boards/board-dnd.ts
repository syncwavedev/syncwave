import {getContext, onDestroy, setContext} from 'svelte';
import {
	compareBigFloat,
	EventEmitter,
	runAll,
	toPosition,
	type CardId,
	type ColumnId,
} from 'syncwave-data';
import type {Agent} from '../../agent/agent.svelte.js';
import type {CardView, ColumnView} from '../../agent/view.svelte.js';

export const DND_TRANSITION_DURATION_MS = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lateInit(): any {
	return undefined;
}

type Cleanup = () => void;

export interface Ref<T> {
	value: T;
}

interface CleanupContext {
	cleanups: Cleanup[];
}

export interface DndCardContext extends CleanupContext {
	card: Ref<CardView>;
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
	container: HTMLDivElement = lateInit();
	scrollable: HTMLDivElement = lateInit();
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
				card,
				card.container,
				'pointermove',
				moveEvent => {
					if (downEvent.pointerId !== moveEvent.pointerId) return;

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
		const draggable: Draggable = {
			element: card.container.cloneNode(true) as HTMLDivElement,
			targetX: card.container.getBoundingClientRect().left,
			targetY: card.container.getBoundingClientRect().top,
			targetColumnId: card.card.value.columnId,
		};
		document.body.appendChild(draggable.element);

		this.agent.recordDragSettled(card.card.value.id);

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

		draggable.element.setPointerCapture(downEvent.pointerId);

		const startPointerX = downEvent.pageX;
		const startPointerY = downEvent.pageY;

		const cancelPointerMove = this.addListener(
			this,
			draggable.element,
			'pointermove',
			moveEvent => {
				const deltaX = moveEvent.pageX - startPointerX;
				const deltaY = moveEvent.pageY - startPointerY;

				draggable.element.style.left = `${startDraggableX + deltaX}px`;
				draggable.element.style.top = `${startDraggableY + deltaY}px`;

				this.handlePlacement(draggable, card);
			}
		);

		const cancelScrollListener = this.scrollEmitter.subscribe(() => {
			this.handlePlacement(draggable, card);
		});

		const cancelAutoscroll = this.monitorAutoscroll(draggable);

		let cleanedUp = false;
		const cleanup = () => {
			if (cleanedUp) return;
			cleanedUp = true;

			cancelAutoscroll();
			cancelPointerUp();
			cancelPointerMove();
			cancelScrollListener('startDrag cleanup');
			cancelPointerCancel();
			cancelDragSub('startDrag cleanup');

			draggable.element.releasePointerCapture(downEvent.pointerId);
			this.handleDrop(card.card.value.id, draggable);
		};

		const cancelDragSub = this.cancelDragEmitter.subscribe(() => {
			cleanup();
		});

		const cancelPointerUp = this.addListener(
			this,
			draggable.element,
			'pointerup',
			cleanup
		);
		const cancelPointerCancel = this.addListener(
			this,
			draggable.element,
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

	private handleDrop(cardId: CardId, draggable: Draggable) {
		const card = this.cards.find(x => x.card.value.id === cardId);
		if (!card || !card.container.isConnected) {
			if (draggable.element.isConnected) {
				document.body.removeChild(draggable.element);
			}

			if (card) {
				this.agent.markAsDragDone(card.card.value.id);
			}

			return;
		}

		const draggableRect = draggable.element.getBoundingClientRect();

		const transition = `transform ${DND_TRANSITION_DURATION_MS}ms ease`;
		draggable.element.style.transition = draggable.element.style.transition
			? draggable.element.style.transition + ',' + transition
			: transition;
		const animateToX = draggable.targetX - draggableRect.x;
		const animateToY = draggable.targetY - draggableRect.y;

		draggable.element.style.transform = `translate(${animateToX}px, ${animateToY}px)`;

		setTimeout(() => {
			if (draggable.element.isConnected) {
				document.body.removeChild(draggable.element);
			}

			this.agent.markAsDragDone(card.card.value.id);
		}, DND_TRANSITION_DURATION_MS);
	}

	private handlePlacement(draggable: Draggable, card: DndCardContext) {
		const draggableRect = draggable.element.getBoundingClientRect();
		const draggableCenterX =
			draggableRect.left + draggable.element.clientWidth / 2;
		const draggableCenterY =
			draggableRect.top + draggable.element.clientHeight / 2;

		const targetColumn =
			this.columns
				.filter(x => x.container.isConnected)
				.find(column => {
					const rect = column.scrollable.getBoundingClientRect();
					return (
						draggableCenterX >= rect.left &&
						draggableCenterX <= rect.right &&
						draggableCenterY >= rect.top &&
						draggableCenterY <= rect.bottom
					);
				}) ??
			this.columns.find(
				x => x.column.value.id === card.card.value.columnId
			);

		if (!targetColumn) {
			return;
		}

		this.handleCardPlacement(targetColumn, card, draggable);
	}

	private handleCardPlacement(
		targetColumn: DndColumnContext,
		card: DndCardContext,
		draggable: Draggable
	) {
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
				compareBigFloat(
					a.card.value.columnPosition,
					b.card.value.columnPosition
				)
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

		// todo: use parameter
		const GAP = 6; // 6px

		let offsetTop = targetColumn.container.getBoundingClientRect().top;
		const offsetLeft = targetColumn.container.getBoundingClientRect().left;
		for (const neighbor of columnCards) {
			const neighborRectNative =
				neighbor.container.getBoundingClientRect();
			const neighborRect = {
				height: neighborRectNative.height,
				width: neighborRectNative.width,
				left: neighborRectNative.left,
				top: offsetTop,
			};
			const combinedHeight = neighborRect.height + GAP + cardHeight;
			const combinedTop = offsetTop;
			const combinedCenterY = combinedTop + combinedHeight / 2;

			if (draggableCenterY <= combinedCenterY) {
				next = neighbor;

				break;
			}

			prev = neighbor;
			if (neighbor.card.value.id !== card.card.value.id) {
				offsetTop += GAP + neighborRect.height;
			}
		}

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
				prev: prev?.card.value.columnPosition,
				next: next?.card.value.columnPosition,
			});
			this.agent.setCardPosition(
				card.card.value.id,
				targetColumn.column.value.id,
				newCardPosition
			);
		}

		draggable.targetX = offsetLeft;
		draggable.targetY = offsetTop;
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
		this.tick();
	}

	tick() {
		const now = performance.now();
		const scale = (now - this.lastTick) / 1000;
		this.lastTick = now;

		if (this.isCancelled) return;

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

		if (dx || dy) {
			const SPEED = 500; // px / second
			const adjustment = SPEED * scale;

			this.target.scrollBy({
				left: dx * adjustment,
				top: dy * adjustment,
			});
		}

		requestAnimationFrame(() => this.tick());
	}

	destroy() {
		this.isCancelled = true;
	}
}
