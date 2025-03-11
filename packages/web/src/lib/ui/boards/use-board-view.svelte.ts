import {calculateChange} from '$lib/dnd';
import {setCardPosition, setColumnPosition} from '$lib/sdk/sdk.svelte';
import type {State} from '$lib/sdk/state';
import type {
	BoardTreeView,
	CardView,
	ColumnTreeView,
	ColumnView,
} from '$lib/sdk/view.svelte';
import {getSdk} from '$lib/utils';
import {untrack} from 'svelte';
import {
	SHADOW_ITEM_MARKER_PROPERTY_NAME,
	type DndEvent,
} from 'svelte-dnd-action';
import {
	assert,
	compareBigFloat,
	log,
	type CardId,
	type ColumnId,
} from 'syncwave-data';

export interface DndCard {
	id: CardId;
	card: CardView;
}

export interface DndColumn {
	id: ColumnId;
	column: ColumnView;
	cards: DndCard[];
}

export function useBoardView(localBoard: State<BoardTreeView>) {
	// Reactive state for columns with initial sorting
	const dndColumns = $state({value: applyOrder(localBoard.value.columns)});

	// Effect to sync remoteBoard with localBoard and update dndColumns
	$effect(() => {
		const latestColumns = applyOrder(localBoard.value.columns);
		untrack(() => {
			// Handle drag-and-drop shadow items
			const shadowColumn: DndColumn | undefined = dndColumns.value.find(
				item => SHADOW_ITEM_MARKER_PROPERTY_NAME in item
			);
			const shadowCard: DndCard | undefined = dndColumns.value
				.flatMap(x => x.cards)
				.find(item => SHADOW_ITEM_MARKER_PROPERTY_NAME in item);

			const toShadowColumn = (column: DndColumn): DndColumn => ({
				...column,
				cards: column.cards.map(card =>
					card.id === shadowCard?.id ? {...shadowCard, ...card} : card
				),
			});

			dndColumns.value = latestColumns.map(column =>
				column.id === shadowColumn?.id
					? {...shadowColumn, ...toShadowColumn(column)}
					: toShadowColumn(column)
			);
		});
	});

	const sdk = getSdk();

	// Handler for column drag-and-drop
	function setColumns(e: CustomEvent<DndEvent<DndColumn>>) {
		const newDndColumns = e.detail.items;
		const update = calculateChange(
			localBoard.value.columns,
			dndColumns.value.map(x => x.column),
			newDndColumns.map(x => x.column),
			column => column?.boardPosition
		);

		if (update) {
			const {target, newPosition} = update;
			const diff = setColumnPosition(target, newPosition);
			if (diff) {
				sdk(x => x.applyColumnDiff({columnId: target, diff})).catch(
					error => log.error(error, 'failed to send column diff')
				);
			}
		}
		dndColumns.value = newDndColumns;
	}

	// Handler for card drag-and-drop within a column
	function setCards(dndColumn: DndColumn, e: CustomEvent<DndEvent<DndCard>>) {
		assert(dndColumn !== undefined, 'dnd column not found');
		const localColumn = localBoard.value.columns.find(
			x => x.id === dndColumn.id
		);
		assert(localColumn !== undefined, 'local column not found');
		const update = calculateChange(
			localColumn.cards,
			dndColumn.cards.map(x => x.card),
			e.detail.items.map(x => x.card),
			card => card?.columnPosition
		);

		if (update) {
			const {target, newPosition} = update;
			const diff = setCardPosition(target, dndColumn.id, newPosition);
			if (diff) {
				sdk(x => x.applyCardDiff({cardId: target, diff})).catch(error =>
					log.error(error, 'failed to send card diff')
				);
			}
		}
		dndColumn.cards = e.detail.items;
	}

	// Sort columns and cards by position
	function applyOrder(columns: ColumnTreeView[]): DndColumn[] {
		const result: DndColumn[] = [...columns]
			.sort((a, b) => compareBigFloat(a.boardPosition, b.boardPosition))
			.map(
				(column): DndColumn => ({
					id: column.id,
					column,
					cards: column.cards.map(card => ({id: card.id, card})),
				})
			);
		for (const column of result) {
			column.cards = [...column.cards].sort((a, b) =>
				compareBigFloat(a.card.columnPosition, b.card.columnPosition)
			);
		}
		return result;
	}

	function createCardHandler(dndColumn: DndColumn) {
		return (e: CustomEvent<DndEvent<DndCard>>) => setCards(dndColumn, e);
	}

	// Return reactive state and handlers
	return {
		columns: dndColumns,
		handleDndConsiderColumns: setColumns,
		handleDndFinalizeColumns: setColumns,
		createCardHandler,
	};
}
