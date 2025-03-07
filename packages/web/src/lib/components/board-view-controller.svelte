<script lang="ts">
	import {
		assert,
		log,
		toPosition,
		type BoardViewColumnDto,
		type BoardViewDto,
		type BoardViewCardDto,
	} from 'syncwave-data';
	import {
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent,
	} from 'svelte-dnd-action';
	import BoardView from './board-view.svelte';
	import {BoardViewCrdt} from '$lib/crdt/board-view-crdt';
	import {compareBigFloat, type BigFloat} from 'syncwave-data';
	import {getSdk} from '$lib/utils';
	import {untrack} from 'svelte';
	import {calculateChange, findMoved} from '$lib/dnd';

	let {board: remoteBoard}: {board: BoardViewDto} = $props();

	const localBoard = new BoardViewCrdt(remoteBoard);
	$effect(() => {
		localBoard.apply(remoteBoard);
		const latestColumns = applyOrder(localBoard.snapshot().columns);
		untrack(() => {
			const shadowColumn = dndColumns.find(
				item => (item as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME]
			);

			const shadowCard = dndColumns
				.flatMap(x => x.cards)
				.find(item => (item as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME]);

			const mapColumn = (column: BoardViewColumnDto) => {
				return {
					...column,
					cards: column.cards.map(card =>
						card.pk[0] === shadowCard?.pk[0]
							? {
									...shadowCard,
									...card,
								}
							: card
					),
				};
			};

			dndColumns = latestColumns.map(column =>
				column.id === shadowColumn?.id
					? {
							...shadowColumn,
							...mapColumn(column),
						}
					: mapColumn(column)
			);
		});
	});

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

	let dndColumns = $state(
		applyOrder($state.snapshot(remoteBoard.columns) as BoardViewColumnDto[])
	);

	const sdk = getSdk();

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

			sdk(x =>
				x.applyColumnDiff({
					columnId: target,
					diff,
				})
			).catch(error => {
				log.error(error, 'failed to send column diff');
			});
		}

		dndColumns = newDndColumns;
	}

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

			sdk(x =>
				x.applyCardDiff({
					cardId: target,
					diff,
				})
			).catch(error => {
				log.error(error, 'failed to send card diff');
			});
		}

		dndColumn.cards = e.detail.items;
	}
</script>

<BoardView
	columns={dndColumns}
	handleDndConsiderCards={setCards}
	handleDndFinalizeCards={setCards}
	handleDndConsiderColumns={setColumns}
	handleDndFinalizeColumns={setColumns}
/>
