<script lang="ts">
	import {
		assert,
		log,
		toPosition,
		type BoardViewColumnDto,
		type BoardViewDto,
		type BoardViewCardDto,
		Crdt,
	} from 'syncwave-data';
	import {
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent,
	} from 'svelte-dnd-action';
	import {BoardViewCrdt} from '$lib/crdt/board-view-crdt';
	import {compareBigFloat} from 'syncwave-data';
	import {getSdk} from '$lib/utils';
	import {untrack} from 'svelte';
	import {calculateChange} from '$lib/dnd';
	import ColumnList from './column-list.svelte';

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
		applyOrder(
			remoteBoard.columns.map(x => ({...x})) as BoardViewColumnDto[]
		)
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

			if (diff) {
				sdk(x =>
					x.applyColumnDiff({
						columnId: target,
						diff,
					})
				).catch(error => {
					log.error(error, 'failed to send column diff');
				});
			}
		}

		dndColumns = newDndColumns;
	}
</script>

<ColumnList
	columns={dndColumns}
	handleDndConsiderColumns={setColumns}
	handleDndFinalizeColumns={setColumns}
/>
