import {BoardViewCrdt} from '$lib/crdt/board-view-crdt';
import {calculateChange} from '$lib/dnd';
import {getSdk} from '$lib/utils';
import type {Observable} from '$lib/utils.svelte';
import {untrack} from 'svelte';
import {
	SHADOW_ITEM_MARKER_PROPERTY_NAME,
	type DndEvent,
} from 'svelte-dnd-action';
import {
	assert,
	compareBigFloat,
	log,
	type BoardViewCardDto,
	type BoardViewColumnDto,
	type BoardViewDto,
} from 'syncwave-data';

export function useBoardView(remoteBoard: Observable<BoardViewDto>) {
	// Initialize local CRDT instance
	const localBoard = new BoardViewCrdt(remoteBoard.value);

	// Reactive state for columns with initial sorting
	let dndColumns = $state(applyOrder(remoteBoard.value.columns));

	// Effect to sync remoteBoard with localBoard and update dndColumns
	$effect(() => {
		localBoard.apply(remoteBoard.value);
		const latestColumns = applyOrder(localBoard.snapshot().columns);
		untrack(() => {
			// Handle drag-and-drop shadow items
			const shadowColumn = dndColumns.find(
				item => SHADOW_ITEM_MARKER_PROPERTY_NAME in item
			) as BoardViewColumnDto | undefined;
			const shadowCard = dndColumns
				.flatMap(x => x.cards)
				.find(item => SHADOW_ITEM_MARKER_PROPERTY_NAME in item) as
				| BoardViewCardDto
				| undefined;

			const mapColumn = (column: BoardViewColumnDto) => ({
				...column,
				cards: column.cards.map(card =>
					card.pk[0] === shadowCard?.pk[0] ? {...shadowCard, ...card} : card
				),
			});

			dndColumns = latestColumns.map(column =>
				column.id === shadowColumn?.id
					? {...shadowColumn, ...mapColumn(column)}
					: mapColumn(column)
			);
		});
	});

	const sdk = getSdk();

	// Handler for column drag-and-drop
	function setColumns(e: CustomEvent<DndEvent<BoardViewColumnDto>>) {
		const newDndColumns = e.detail.items;
		const update = calculateChange(
			localBoard.snapshot().columns,
			dndColumns,
			newDndColumns,
			column => column?.boardPosition
		);

		if (update) {
			const {target, newPosition} = update;
			const diff = localBoard.setColumnPosition(target, newPosition);
			sdk(x => x.applyColumnDiff({columnId: target, diff})).catch(error =>
				log.error(error, 'failed to send column diff')
			);
		}
		dndColumns = newDndColumns;
	}

	// Handler for card drag-and-drop within a column
	function setCards(
		dndColumn: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewCardDto>>
	) {
		assert(dndColumn !== undefined, 'dnd column not found');
		const localColumn = localBoard
			.snapshot()
			.columns.find(x => x.id === dndColumn.id);
		assert(localColumn !== undefined, 'local column not found');
		const update = calculateChange(
			localColumn.cards,
			dndColumn.cards,
			e.detail.items,
			card => card?.columnPosition
		);

		if (update) {
			const {target, newPosition} = update;
			const diff = localBoard.setCardPosition(
				target,
				newPosition,
				dndColumn.id
			);
			sdk(x => x.applyCardDiff({cardId: target, diff})).catch(error =>
				log.error(error, 'failed to send card diff')
			);
		}
		dndColumn.cards = e.detail.items;
	}

	// Sort columns and cards by position
	function applyOrder(columns: BoardViewColumnDto[]) {
		const result = [...columns].sort((a, b) =>
			compareBigFloat(a.boardPosition, b.boardPosition)
		);
		for (const column of result) {
			column.cards = [...column.cards].sort((a, b) =>
				compareBigFloat(a.columnPosition, b.columnPosition)
			);
		}
		return result;
	}

	// Factory function to create card handlers per column
	function createCardHandler(dndColumn: BoardViewColumnDto) {
		return (e: CustomEvent<DndEvent<BoardViewCardDto>>) =>
			setCards(dndColumn, e);
	}

	// Return reactive state and handlers
	return {
		columns: dndColumns,
		handleDndConsiderColumns: setColumns,
		handleDndFinalizeColumns: setColumns,
		createCardHandler,
	};
}
