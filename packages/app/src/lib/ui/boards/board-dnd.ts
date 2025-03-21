import {getContext, onDestroy, setContext} from 'svelte';
import {
	compareBigFloat,
	EventEmitter,
	runAll,
	toPosition,
	type BigFloat,
	type BoardId,
	type CardId,
	type ColumnId,
} from 'syncwave-data';
import type {CardView, ColumnView} from '../../agent/view.svelte.js';

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

export interface DndBoardContextOptions {
	readonly boardId: BoardId;
	readonly setCardPosition: (
		cardId: CardId,
		columnId: ColumnId,
		position: BigFloat
	) => void;
}

interface Draggable {
	element: HTMLElement;
	targetX: number;
	targetY: number;
}

export class DndBoardContext {
	container: HTMLDivElement = lateInit();
	scrollable: HTMLDivElement = lateInit();
	private columns: DndColumnContext[] = [];
	private cards: DndCardContext[] = [];
	public cleanups: Cleanup[] = [];

	private scrollEmitter = new EventEmitter<void>();

	constructor(private readonly options: DndBoardContextOptions) {}

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

		this.addListener(card, card.container, 'pointerdown', e => {
			this.startDrag(e, card);
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
		};
		document.body.appendChild(draggable.element);

		card.container.dataset.dndPlaceholder = 'true';

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

		let cleanedUp = false;
		const cleanup = () => {
			if (cleanedUp) return;
			cleanedUp = true;

			cancelPointerUp();
			cancelPointerMove();
			cancelScrollListener('startDrag cleanup');
			cancelPointerCancel();
			globalListeners.forEach(cancel => cancel());

			draggable.element.releasePointerCapture(downEvent.pointerId);
			this.handleDrop(card.card.value.id, draggable);
		};

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

		// global listeners to cover potential interruptions
		const globalEvents = [
			'contextmenu',
			'blur',
			'visibilitychange',
			'pointerleave',
		];
		const globalListeners: Array<() => void> = [];

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		globalEvents.forEach((eventName: any) => {
			const cancelListener = this.addListener(
				this,
				document,
				eventName,
				() => {
					cleanup();
				}
			);
			globalListeners.push(cancelListener);
		});
	}

	private handleDrop(cardId: CardId, draggable: Draggable) {
		const card = this.cards.find(x => x.card.value.id === cardId);
		if (!card || !card.container.isConnected) {
			if (draggable.element.isConnected) {
				document.body.removeChild(draggable.element);
			}

			delete card?.container.dataset.dndPlaceholder;

			return;
		}

		const TRANSITION_DURATION_MS = 300;

		const draggableRect = draggable.element.getBoundingClientRect();

		const transition = `transform ${TRANSITION_DURATION_MS}ms ease`;
		draggable.element.style.transition = draggable.element.style.transition
			? draggable.element.style.transition + ',' + transition
			: transition;
		draggable.element.style.transform = `translate(${draggable.targetX - draggableRect.x}px, ${draggable.targetY - draggableRect.y}px)`;

		setTimeout(() => {
			if (draggable.element.isConnected) {
				document.body.removeChild(draggable.element);
			}

			delete card.container.dataset.dndPlaceholder;
		}, TRANSITION_DURATION_MS);
	}

	private handlePlacement(draggable: Draggable, card: DndCardContext) {
		const draggableRect = draggable.element.getBoundingClientRect();
		const draggableCenterX =
			draggableRect.left + draggable.element.clientWidth / 2;
		const draggableCenterY =
			draggableRect.top + draggable.element.clientHeight / 2;

		const targetColumn = this.columns
			.filter(x => x.container.isConnected)
			.find(column => {
				const rect = column.scrollable.getBoundingClientRect();
				return (
					draggableCenterX >= rect.left &&
					draggableCenterX <= rect.right &&
					draggableCenterY >= rect.top &&
					draggableCenterY <= rect.bottom
				);
			});

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

		if (
			(oldIndexInTargetColumn === -1 ||
				(prev?.card.value.id !== card.card.value.id &&
					next?.card.value.id !== card.card.value.id)) &&
			(oldPrev === undefined ||
				oldPrev?.card.value.id !== prev?.card.value.id ||
				oldNext === undefined ||
				oldNext?.card.value.id !== next?.card.value.id)
		) {
			const newCardPosition = toPosition({
				prev: prev?.card.value.columnPosition,
				next: next?.card.value.columnPosition,
			});
			this.options.setCardPosition(
				card.card.value.id,
				targetColumn.column.value.id,
				newCardPosition
			);

			draggable.targetX = offsetLeft;
			draggable.targetY = offsetTop;
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

export function createDndContext(
	options: DndBoardContextOptions
): DndBoardContext {
	const existingContext = getContext(DND_CONTEXT);
	if (existingContext) {
		throw new Error('DndContext already exists');
	}

	const context = new DndBoardContext(options);
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
