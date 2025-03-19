import {untrack} from 'svelte';
import {
	assert,
	compareBigFloat,
	zip,
	type CardId,
	type ColumnId,
} from 'syncwave-data';
import {SHADOW_ITEM_MARKER_PROPERTY_NAME, type DndEvent} from 'syncwave-dnd';
import {getAgent} from '../../agent/agent.svelte';
import type {State} from '../../agent/state';
import type {
	BoardTreeView,
	CardView,
	ColumnTreeView,
	ColumnView,
} from '../../agent/view.svelte';
import {calculateChange} from '../../dnd';

export interface DndCard {
	id: CardId;
	card: CardView;
}

export interface DndColumn {
	id: ColumnId;
	column: ColumnView;
	cards: DndCard[];
}

export function useBoardView(board: State<BoardTreeView>) {
	const dndColumns = $state({value: applyOrder(board.value.columns)});

	$effect(() => {
		const latestColumns = applyOrder(board.value.columns);
		if (
			untrack(() => {
				return (
					latestColumns.length === dndColumns.value.length &&
					zip(latestColumns, dndColumns.value).every(
						([a, b]) =>
							a.id === b.id &&
							a.cards.length === b.cards.length &&
							zip(a.cards, b.cards).every(
								([a, b]) =>
									a.id === b.id && a.card.id === b.card.id
							)
					)
				);
			})
		) {
			return;
		}
		untrack(() => {
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

	const agent = getAgent();

	function setColumns(e: CustomEvent<DndEvent<DndColumn>>) {
		const newDndColumns = e.detail.items;
		const update = calculateChange(
			board.value.columns,
			dndColumns.value.map(x => x.column),
			newDndColumns.map(x => x.column),
			column => column?.boardPosition
		);

		if (update) {
			const {target, newPosition} = update;
			agent.setColumnPosition(target, newPosition);
		}
		dndColumns.value = newDndColumns;
	}

	function setCards(dndColumn: DndColumn, e: CustomEvent<DndEvent<DndCard>>) {
		assert(dndColumn !== undefined, 'dnd column not found');
		const localColumn = board.value.columns.find(
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
			agent.setCardPosition(target, dndColumn.id, newPosition);
		}
		dndColumn.cards = e.detail.items;
	}

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

	return {
		columns: dndColumns,
		handleDndConsiderColumns: setColumns,
		handleDndFinalizeColumns: setColumns,
		createCardHandler,
	};
}
