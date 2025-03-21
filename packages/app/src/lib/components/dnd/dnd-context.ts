import {getContext, onDestroy, setContext} from 'svelte';
import {
	compareBigFloat,
	runAll,
	toPosition,
	type BigFloat,
	type BoardId,
	type CardId,
	type ColumnId,
} from 'syncwave-data';
import type {CardView, ColumnView} from '../../agent/view.svelte';

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

export class DndBoardContext {
	container: HTMLDivElement = lateInit();
	scrollable: HTMLDivElement = lateInit();
	private columns: DndColumnContext[] = [];
	private cards: DndCardContext[] = [];
	public cleanups: Cleanup[] = [];

	constructor(private readonly options: DndBoardContextOptions) {}

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
		);
	}

	private startDrag(downEvent: PointerEvent, card: DndCardContext) {
		const draggable = card.container.cloneNode(true) as HTMLDivElement;
		document.body.appendChild(draggable);

		card.container.dataset.dndPlaceholder = 'true';

		console.log('set', card.container);

		draggable.style.position = 'absolute';
		draggable.style.pointerEvents = 'none';
		draggable.style.zIndex = '1000';
		draggable.style.userSelect = 'none';
		draggable.style.width = `${card.container.clientWidth}px`;
		draggable.style.height = `${card.container.clientHeight}px`;
		draggable.style.top = `${card.container.getBoundingClientRect().top}px`;
		draggable.style.left = `${card.container.getBoundingClientRect().left}px`;

		draggable.setPointerCapture(downEvent.pointerId);

		const startX = downEvent.pageX;
		const startY = downEvent.pageY;

		const cancelPointerMove = this.addListener(
			this,
			draggable,
			'pointermove',
			moveEvent => {
				const deltaX = moveEvent.pageX - startX;
				const deltaY = moveEvent.pageY - startY;
				draggable.style.setProperty(
					'transform',
					`translate(${deltaX}px, ${deltaY}px)`
				);

				this.handlePlacement(draggable, card);
			}
		);

		const cleanup = () => {
			cancelPointerUp();
			cancelPointerMove();

			delete card.container.dataset.dndPlaceholder;

			if (draggable.isConnected) {
				draggable.releasePointerCapture(downEvent.pointerId);
				document.body.removeChild(draggable);
			}
		};

		const cancelPointerUp = this.addListener(
			this,
			draggable,
			'pointerup',
			cleanup
		);
	}

	private handlePlacement(draggable: HTMLDivElement, card: DndCardContext) {
		const draggableRect = draggable.getBoundingClientRect();
		const draggableCenterX = draggableRect.left + draggable.clientWidth / 2;
		const draggableCenterY = draggableRect.top + draggable.clientHeight / 2;

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

		if (targetColumn) {
			this.handleCardPlacement(
				targetColumn,
				card,
				draggableRect.height,
				draggableCenterY
			);
		}
	}

	private handleCardPlacement(
		targetColumn: DndColumnContext,
		card: DndCardContext,
		cardHeight: number,
		draggableCenterY: number
	) {
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
		for (const [index, neighbor] of columnCards.entries()) {
			const neighborRectNative =
				neighbor.container.getBoundingClientRect();
			const neighborRect = {
				height: neighborRectNative.height,
				width: neighborRectNative.width,
				left: neighborRectNative.left,
				top: offsetTop,
			};
			const combinedHeight = neighborRect.height + GAP + cardHeight;
			const combinedTop =
				oldIndexInTargetColumn > index || oldIndexInTargetColumn === -1
					? neighborRect.top
					: neighborRect.top - cardHeight - GAP;
			const combinedCenterY = combinedTop + combinedHeight / 2;

			if (draggableCenterY <= combinedCenterY) {
				next = neighbor;

				break;
			}

			prev = neighbor;
			offsetTop += GAP + neighborRect.height;
		}

		if (
			(oldIndexInTargetColumn === -1 ||
				(prev?.card.value.id !== card.card.value.id &&
					next?.card.value.id !== card.card.value.id)) &&
			(oldPrev?.card.value.id !== prev?.card.value.id ||
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
		}
	}

	private addListener<K extends keyof HTMLElementEventMap>(
		cleanupContext: CleanupContext,
		element: HTMLElement,
		event: K,
		handler: (event: HTMLElementEventMap[K], cleanup: Cleanup) => void
	) {
		const cleanup = () => {
			element.removeEventListener(event, wrapper);
			cleanupContext.cleanups = cleanupContext.cleanups.filter(
				x => x !== wrapper
			);
		};

		const wrapper = (e: HTMLElementEventMap[K]) => {
			handler(e, cleanup);
		};

		cleanupContext.cleanups.push(cleanup);

		element.addEventListener(event, wrapper);

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
