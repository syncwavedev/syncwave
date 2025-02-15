<script lang="ts">
	import {
		assert,
		log,
		stringifyCrdtDiff,
		toPosition,
		type BoardViewColumnDto,
		type BoardViewDto,
		type BoardViewTaskDto,
	} from 'syncwave-data';
	import {
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent,
	} from 'svelte-dnd-action';
	import BoardInner from './board-inner.svelte';
	import {BoardViewCrdt} from '$lib/crdt/board-view-crdt';
	import {compareBigFloat} from '../../../../../../data/dist/esm/src/big-float';
	import {getSdk} from '$lib/utils';
	import {findMoved} from '$lib/move';
	import {untrack} from 'svelte';

	let {board: remoteBoard}: {board: BoardViewDto} = $props();

	const localBoard = new BoardViewCrdt(remoteBoard);
	$effect(() => {
		localBoard.apply(remoteBoard);
		const latestColumns = applyOrder(localBoard.snapshot().columns);
		untrack(() => {
			const shadowItem = columns.find(
				item => (item as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME]
			);
			console.log(
				$state.snapshot({
					columns,
					serverItems: latestColumns,
					shadowItem,
				})
			);

			columns = latestColumns.map(column =>
				column.id === shadowItem?.id
					? {
							...shadowItem,
							...column,
						}
					: column
			);
		});
	});

	function applyOrder(columns: BoardViewColumnDto[]) {
		const result = [...columns].sort((a, b) =>
			compareBigFloat(a.boardPosition, b.boardPosition)
		);

		for (const column of result) {
			column.tasks = [...column.tasks].sort((a, b) =>
				compareBigFloat(a.columnPosition, b.columnPosition)
			);
		}

		return result;
	}

	let columns = $state(
		applyOrder($state.snapshot(remoteBoard.columns) as BoardViewColumnDto[])
	);

	function toIds<T extends {pk: [unknown]}>(items: T[]): T['pk'][0][] {
		return items.map(item => item.pk[0]);
	}

	const sdk = getSdk();

	function setColumns(e: CustomEvent<DndEvent<BoardViewColumnDto>>) {
		const newColumns = e.detail.items;
		const moved = findMoved(toIds(columns), toIds(newColumns));

		if (moved) {
			const {target, prev, next} = moved;
			const localColumns = localBoard.snapshot().columns;
			const prevColumn = localColumns.find(x => x.id === prev);
			const nextColumn = localColumns.find(x => x.id === next);

			const newTargetPosition = toPosition({
				next: nextColumn?.boardPosition,
				prev: prevColumn?.boardPosition,
			});

			const diff = localBoard.setColumnPosition(
				target,
				newTargetPosition
			);

			if (diff) {
				sdk(x =>
					x.applyColumnDiff({
						columnId: target,
						diff: stringifyCrdtDiff(diff),
					})
				).catch(error => {
					log.error(error, 'failed to send column diff');
				});
			}
		}

		columns = newColumns;
	}

	function setTasks(
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) {
		column.tasks = e.detail.items;
	}
</script>

<BoardInner
	{columns}
	flipDurationMs={100}
	handleDndConsiderCards={setTasks}
	handleDndFinalizeCards={setTasks}
	handleDndConsiderColumns={setColumns}
	handleDndFinalizeColumns={setColumns}
/>
